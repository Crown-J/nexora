import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx05DocNo } from '../../shared/nx05/nx05-doc-no';
import { assertClosingStatusTransition, ClosingStatus } from '../../shared/nx05/nx05-state-machine';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';
import { monthsInPeriod, yearPeriod } from '../../shared/nx05/nx05-period-lock';
import {
  buildMainForm,
  buildMediaRow,
  rocYearMonth,
  splitTaxFromGross,
} from '../../shared/nx05/nx05-401-txt-formatter';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePeriodCloseDto, PatchPeriodCloseDto } from './dto/period-close.dto';

const CL_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  closingDate: true,
  closedAt: true,
  closedBy: true,
  isAuto: true,
  reportPrintedAt: true,
  reportPrintedBy: true,
  status: true,
  reopenedAt: true,
  reopenedBy: true,
  reopenReason: true,
  remark: true,
  // v1.2 階段 F P1 新欄
  reportPeriod: true,
  reportFiledAt: true,
  reportFiledBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

// v1.2 階段 F P3 D：算曆月日期所屬會計月份字串 'YYYY-MM'（用於 idempotency 檢查）
function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// v1.2 階段 F P3 D：將任意 closingDate 規範化為「該月最後一日」
//   - 約定每月一筆關帳、closingDate 統一指向月底（idempotency + 顯示一致）
// [BUG #6 fix] 用 UTC 函數、避免 local→UTC 轉換倒退一天：
//   舊算法 new Date(d.getFullYear(), d.getMonth() + 1, 0) 用 local time、
//   結果寫 DB DATE 欄位時用 UTC、Asia/Taipei UTC+8 會倒退一天（6/30 → 6/29）。
//   改用 UTC + 中午 12:00 為時間部分、無論 timezone 轉換 DATE 部分都不偏移。
function normalizeMonthEnd(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12, 0, 0));
}

@Injectable()
export class PeriodCloseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx05ListQueryDto): Prisma.Nx05ClosingWhereInput {
    const parts: Prisma.Nx05ClosingWhereInput[] = [{ tenantId }];
    const s = q.search?.trim();
    if (s) {
      parts.push({
        OR: [
          { docNo: { contains: s, mode: 'insensitive' } },
          { remark: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    if (q.status?.trim()) parts.push({ status: q.status.trim() });
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx05ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx05Closing.count({ where }),
      this.prisma.nx05Closing.findMany({
        where,
        orderBy: [{ closingDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: CL_SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx05Closing.findFirst({
      where: { id, tenantId },
      select: CL_SEL,
    });
    if (!row) throw new NotFoundException('Period close not found');
    return row;
  }

  async create(user: RequestUser, dto: CreatePeriodCloseDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      // v1.2 階段 F P3 D：closingDate 統一規範化為「該月最後一日」
      const cd = normalizeMonthEnd(new Date(dto.closingDate));
      const ym = yearMonth(cd);
      const yp = yearPeriod(cd);

      // v1.2 階段 F P3 D：月粒度 idempotency check（每月一筆關帳）
      // 例外：CANCELLED 不算（已撤銷的可重建）
      const dupMonth = await tx.nx05Closing.findFirst({
        where: {
          tenantId,
          status: { not: 'CANCELLED' },
          closingDate: {
            gte: new Date(cd.getFullYear(), cd.getMonth(), 1),
            lte: new Date(cd.getFullYear(), cd.getMonth() + 1, 0, 23, 59, 59),
          },
        },
        select: { id: true, docNo: true },
      });
      if (dupMonth) {
        throw new ConflictException(
          `${ym} 已有關帳紀錄（${dupMonth.docNo}）、每月限一筆。如需重建請先 CANCELLED 既有單`,
        );
      }

      const docNo = await allocNx05DocNo(tx, tenantId, 'CL', 'HQ0');
      const row = await tx.nx05Closing.create({
        data: {
          tenantId,
          docNo,
          closingDate: cd,
          status: ClosingStatus.OPEN,
          isAuto: dto.isAuto ?? false,
          remark: dto.remark?.trim() || null,
          // v1.2 階段 F P1：建立時自動算所屬 401 期碼
          reportPeriod: yp,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: CL_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'CREATE',
        entityTable: 'nx05_closing',
        entityId: row.id,
        entityCode: row.docNo,
        summary: `建立關帳單（${ym} / 401 期 ${yp}）`,
        afterData: row as object,
      });
      return row;
    });
  }

  async patch(user: RequestUser, id: string, dto: PatchPeriodCloseDto) {
    const tenantId = requireTenantId(user);
    if (!dto.status) throw new BadRequestException('status is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Closing.findFirst({
        where: { id, tenantId },
        select: { ...CL_SEL },
      });
      if (!existing) throw new NotFoundException('Period close not found');
      if (dto.status === existing.status) return existing;
      assertClosingStatusTransition(existing.status, dto.status!);
      const data: Prisma.Nx05ClosingUpdateInput = {
        status: dto.status,
        updatedBy: user.sub,
      };
      if (dto.status === ClosingStatus.CLOSED) {
        data.closedAt = new Date();
        data.closedBy = user.sub;
      }
      if (dto.status === ClosingStatus.REOPENED) {
        if (!dto.reopenReason?.trim()) throw new BadRequestException('reopenReason required');
        data.reopenedAt = new Date();
        data.reopenedBy = user.sub;
        data.reopenReason = dto.reopenReason.trim();
      }
      await tx.nx05Closing.update({ where: { id }, data });
      const row = await tx.nx05Closing.findFirst({ where: { id, tenantId }, select: CL_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_closing',
        entityId: id,
        entityCode: existing.docNo,
        summary: `關帳 ${existing.status} -> ${dto.status}`,
        beforeData: existing as object,
        afterData: row as object,
      });
      return row!;
    });
  }

  // ────────────────────────────────────────────────────────────
  // v1.2 階段 F P3 E：401 上報旗標
  // ────────────────────────────────────────────────────────────

  /**
   * 標記該關帳所屬 401 期已上報（C 案）。
   *   - 期內所有月關帳（CLOSED）都會被視為「已上報、整期鎖死」
   *   - 寫 report_filed_at + report_filed_by 在「目標關帳 row」上
   *   - 業務上等該期兩個月都關完才可上報
   */
  async markFiled(user: RequestUser, id: string, remark?: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Closing.findFirst({ where: { id, tenantId }, select: CL_SEL });
      if (!existing) throw new NotFoundException('Period close not found');
      if (existing.status !== ClosingStatus.CLOSED) {
        throw new BadRequestException('只有 CLOSED 狀態的關帳才可標記 401 已上報');
      }
      if (existing.reportFiledAt) {
        throw new BadRequestException('此關帳所屬 401 期已標記上報、不可重複');
      }
      const yp = existing.reportPeriod ?? yearPeriod(new Date(existing.closingDate));
      const months = monthsInPeriod(yp);

      // 業務檢查：該期兩個月關帳都齊（兩筆 CLOSED row）才允許上報
      const periodClosings = await tx.nx05Closing.findMany({
        where: { tenantId, reportPeriod: yp, status: ClosingStatus.CLOSED },
        select: { id: true, closingDate: true },
      });
      if (periodClosings.length < 2) {
        throw new BadRequestException(
          `401 期 ${yp}（含 ${months.join(' / ')}）尚未兩個月都關帳完成（目前 ${periodClosings.length}/2）`,
        );
      }
      await tx.nx05Closing.update({
        where: { id },
        data: {
          reportFiledAt: new Date(),
          reportFiledBy: user.sub,
          remark: remark?.trim() ? `${existing.remark ? existing.remark + ' | ' : ''}401 上報：${remark.trim()}` : existing.remark,
          updatedBy: user.sub,
        },
      });
      const row = await tx.nx05Closing.findFirst({ where: { id, tenantId }, select: CL_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_closing',
        entityId: id,
        entityCode: existing.docNo,
        summary: `標記 401 期 ${yp} 已上報、整期（${months.join(' / ')}）鎖死`,
        beforeData: existing as object,
        afterData: row as object,
      });
      return row!;
    });
  }

  // ────────────────────────────────────────────────────────────
  // v1.2 階段 F P3 F：401 雙月一期彙整預覽
  // ────────────────────────────────────────────────────────────

  /**
   * 預覽該 401 期（雙月一期）的銷項 / 進項彙整。
   *
   * [BUG #6 fix] 改算法跟 TXT export 對齊（拆 5% 稅）：
   *   - 銷項淨額：SUM(so.subtotal) − SUM(sr.subtotal)（未稅淨額）
   *   - 進項淨額：SUM(rr.subtotal) − SUM(pr.subtotal)（未稅淨額）
   *   - 銷項稅額：SUM(so.taxAmount) − SUM(sr.taxAmount)
   *   - 進項稅額：SUM(rr.taxAmount) − SUM(pr.taxAmount)
   *   - 應納稅額：銷項稅額 − 進項稅額（正確算法、跟 TXT 一致）
   * 舊算法用 totalAmount（含稅）相減當「應納稅額」、實際是毛差額、跟 TXT 差 20 倍。
   */
  async previewPeriod401(user: RequestUser, yp: string) {
    const tenantId = requireTenantId(user);
    if (!/^\d{4}-\d{2}$/.test(yp)) {
      throw new BadRequestException(`期碼格式錯誤、需 YYYY-EE（取得 ${yp}）`);
    }
    const months = monthsInPeriod(yp);
    if (months.length !== 2) {
      throw new BadRequestException(`期碼 ${yp} 無效`);
    }
    const [m1, m2] = months;
    const m1Match = m1!.match(/^(\d{4})-(\d{2})$/)!;
    const m2Match = m2!.match(/^(\d{4})-(\d{2})$/)!;
    const startDate = new Date(parseInt(m1Match[1]!, 10), parseInt(m1Match[2]!, 10) - 1, 1);
    const endDate = new Date(parseInt(m2Match[1]!, 10), parseInt(m2Match[2]!, 10), 0, 23, 59, 59);

    const [so, sr, rr, pr, closings] = await Promise.all([
      this.prisma.nx04So.aggregate({
        where: { tenantId, soDate: { gte: startDate, lte: endDate }, cancelledAt: null },
        _sum: { totalAmount: true, subtotal: true, taxAmount: true },
        _count: { id: true },
      }),
      this.prisma.nx04Sr.aggregate({
        where: { tenantId, srDate: { gte: startDate, lte: endDate } },
        _sum: { totalAmount: true, subtotal: true, taxAmount: true },
        _count: { id: true },
      }),
      this.prisma.nx02Rr.aggregate({
        where: { tenantId, rrDate: { gte: startDate, lte: endDate }, status: 'POSTED' },
        _sum: { totalAmount: true, subtotal: true, taxAmount: true },
        _count: { id: true },
      }),
      this.prisma.nx02Pr.aggregate({
        where: { tenantId, prDate: { gte: startDate, lte: endDate }, status: 'POSTED' },
        _sum: { totalAmount: true, subtotal: true, taxAmount: true },
        _count: { id: true },
      }),
      this.prisma.nx05Closing.findMany({
        where: { tenantId, reportPeriod: yp },
        select: CL_SEL,
        orderBy: { closingDate: 'asc' },
      }),
    ]);

    // [BUG #6 fix] 跟 TXT 一致：用 subtotal（未稅淨額）跟 taxAmount（5% 稅額）
    // 舊算法用 totalAmount（含稅）相減當應納稅額、實際是毛差額、跟 TXT 差 20 倍
    const salesGross = new PrismaNs.Decimal(so._sum.totalAmount ?? 0);
    const salesReturn = new PrismaNs.Decimal(sr._sum.totalAmount ?? 0);
    const salesSubtotal = new PrismaNs.Decimal(so._sum.subtotal ?? 0).minus(
      new PrismaNs.Decimal(sr._sum.subtotal ?? 0),
    );
    const salesTaxOutput = new PrismaNs.Decimal(so._sum.taxAmount ?? 0).minus(
      new PrismaNs.Decimal(sr._sum.taxAmount ?? 0),
    );
    const purchaseGross = new PrismaNs.Decimal(rr._sum.totalAmount ?? 0);
    const purchaseReturn = new PrismaNs.Decimal(pr._sum.totalAmount ?? 0);
    const purchaseSubtotal = new PrismaNs.Decimal(rr._sum.subtotal ?? 0).minus(
      new PrismaNs.Decimal(pr._sum.subtotal ?? 0),
    );
    const purchaseTaxInput = new PrismaNs.Decimal(rr._sum.taxAmount ?? 0).minus(
      new PrismaNs.Decimal(pr._sum.taxAmount ?? 0),
    );
    // 應納稅額 = 銷項稅 − 進項稅（跟 TXT 一致、不再是 totalAmount 毛差額）
    const taxPayable = salesTaxOutput.minus(purchaseTaxInput);

    return {
      reportPeriod: yp,
      months,
      startDate,
      endDate,
      sales: {
        // [BUG #6 fix] gross/return 保留含稅顯示給會計參考、net 改為未稅淨額（subtotal、跟 TXT 一致）
        gross: salesGross.toString(),
        return: salesReturn.toString(),
        net: salesSubtotal.toString(),
        outputTax: salesTaxOutput.toString(),
        soCount: so._count.id,
        srCount: sr._count.id,
      },
      purchase: {
        gross: purchaseGross.toString(),
        return: purchaseReturn.toString(),
        net: purchaseSubtotal.toString(),
        inputTax: purchaseTaxInput.toString(),
        rrCount: rr._count.id,
        prCount: pr._count.id,
      },
      // [BUG #6 fix] taxPayable = outputTax − inputTax（跟 TXT 一致、應納稅額正確算法）
      taxPayable: taxPayable.toString(),
      closings: closings.map((c) => ({
        id: c.id,
        docNo: c.docNo,
        closingDate: c.closingDate,
        status: c.status,
        reportFiledAt: c.reportFiledAt,
      })),
      filed: closings.some((c) => c.reportFiledAt != null),
      readyToFile: closings.filter((c) => c.status === ClosingStatus.CLOSED).length >= 2,
      note: '應納稅額算法已拆 5%（跟 TXT 一致）：銷項稅 − 進項稅；sales.gross/return 仍顯示含稅總額供會計參考、net 為未稅淨額',
    };
  }

  // ────────────────────────────────────────────────────────────
  // v1.2 階段 F P5 A：401 媒體申報 TXT 兩檔輸出
  // ────────────────────────────────────────────────────────────

  /**
   * 產生 401 期的兩個申報檔（純 ASCII、依財政部規範）：
   *   1) {統編}.TXT      進銷項資料檔（fixed-width 81 字元 / 行）
   *   2) {統編}.TET_U    401 主表檔（112 欄、|分隔）
   *
   * 回傳 base64 字串、前端 decode 後分別存檔。
   */
  async export401Txt(user: RequestUser, yp: string) {
    const tenantId = requireTenantId(user);
    if (!/^\d{4}-\d{2}$/.test(yp)) {
      throw new BadRequestException(`期碼格式錯誤、需 YYYY-EE（取得 ${yp}）`);
    }
    const months = monthsInPeriod(yp);
    if (months.length !== 2) throw new BadRequestException(`期碼 ${yp} 無效`);
    const [m1, m2] = months;
    const m1Match = m1!.match(/^(\d{4})-(\d{2})$/)!;
    const m2Match = m2!.match(/^(\d{4})-(\d{2})$/)!;
    const startDate = new Date(parseInt(m1Match[1]!, 10), parseInt(m1Match[2]!, 10) - 1, 1);
    const endDate = new Date(parseInt(m2Match[1]!, 10), parseInt(m2Match[2]!, 10), 0, 23, 59, 59);

    // 取我方營業人資料（統編 + 公司名）
    const tenant = await this.prisma.nx99Tenant.findFirst({
      where: { id: tenantId },
      select: { taxId: true, name: true },
    });
    if (!tenant?.taxId) {
      throw new BadRequestException('申報營業人未設統一編號、無法產出 401 TXT、請至公司設定補');
    }
    const filerTaxId = tenant.taxId.padEnd(9, '0').slice(0, 9);
    const yyymm = rocYearMonth(endDate);

    // 抓 SO（銷項）/ SR（銷退）/ RR（進項）/ PR（進貨退出）
    const [sos, srs, rrs, prs] = await Promise.all([
      this.prisma.nx04So.findMany({
        where: { tenantId, soDate: { gte: startDate, lte: endDate }, cancelledAt: null },
        select: {
          docNo: true,
          totalAmount: true,
          subtotal: true,
          taxAmount: true,
          customer: { select: { taxId: true } },
        },
      }),
      this.prisma.nx04Sr.findMany({
        where: { tenantId, srDate: { gte: startDate, lte: endDate } },
        select: {
          docNo: true,
          totalAmount: true,
          subtotal: true,
          taxAmount: true,
          customer: { select: { taxId: true } },
        },
      }),
      this.prisma.nx02Rr.findMany({
        where: { tenantId, rrDate: { gte: startDate, lte: endDate }, status: 'POSTED' },
        select: {
          docNo: true,
          totalAmount: true,
          subtotal: true,
          taxAmount: true,
          supplier: { select: { taxId: true } },
        },
      }),
      this.prisma.nx02Pr.findMany({
        where: { tenantId, prDate: { gte: startDate, lte: endDate }, status: 'POSTED' },
        select: {
          docNo: true,
          totalAmount: true,
          subtotal: true,
          taxAmount: true,
          supplier: { select: { taxId: true } },
        },
      }),
    ]);

    // 組進銷項資料檔（每筆 81 字元）
    const mediaLines: string[] = [];
    let serial = 0;
    for (const so of sos) {
      // 銷售額 / 稅額：用既有 schema subtotal + taxAmount（已拆稅）、taxAmount=0 時拆算
      const sale = so.subtotal && Number(so.subtotal) > 0 ? so.subtotal : splitTaxFromGross(so.totalAmount).sales;
      const tax = so.taxAmount && Number(so.taxAmount) > 0 ? so.taxAmount : splitTaxFromGross(so.totalAmount).tax;
      mediaLines.push(
        buildMediaRow({
          formatCode: '31', // 銷項三聯式
          filerTaxId,
          sellerTaxId: filerTaxId, // 我方銷售
          buyerTaxId: (so.customer?.taxId || '').padStart(8, '0').slice(0, 8) || '00000000',
          serialNo: ++serial,
          yyymm,
          salesAmount: sale,
          taxClass: '1',
          taxAmount: tax,
          deductionCode: ' ', // 銷項補空白
        }),
      );
    }
    for (const sr of srs) {
      const sale = sr.subtotal && Number(sr.subtotal) > 0 ? sr.subtotal : splitTaxFromGross(sr.totalAmount).sales;
      const tax = sr.taxAmount && Number(sr.taxAmount) > 0 ? sr.taxAmount : splitTaxFromGross(sr.totalAmount).tax;
      mediaLines.push(
        buildMediaRow({
          formatCode: '33', // 銷貨退回 / 折讓
          filerTaxId,
          sellerTaxId: filerTaxId,
          buyerTaxId: (sr.customer?.taxId || '').padStart(8, '0').slice(0, 8) || '00000000',
          serialNo: ++serial,
          yyymm,
          salesAmount: sale,
          taxClass: '1',
          taxAmount: tax,
          deductionCode: ' ',
        }),
      );
    }
    for (const rr of rrs) {
      const sale = rr.subtotal && Number(rr.subtotal) > 0 ? rr.subtotal : splitTaxFromGross(rr.totalAmount).sales;
      const tax = rr.taxAmount && Number(rr.taxAmount) > 0 ? rr.taxAmount : splitTaxFromGross(rr.totalAmount).tax;
      mediaLines.push(
        buildMediaRow({
          formatCode: '21', // 進項三聯式
          filerTaxId,
          sellerTaxId: (rr.supplier?.taxId || '').padStart(8, '0').slice(0, 8) || '00000000',
          buyerTaxId: filerTaxId,
          serialNo: ++serial,
          yyymm,
          salesAmount: sale,
          taxClass: '1',
          taxAmount: tax,
          deductionCode: '1', // 1 = 可扣抵
        }),
      );
    }
    for (const pr of prs) {
      const sale = pr.subtotal && Number(pr.subtotal) > 0 ? pr.subtotal : splitTaxFromGross(pr.totalAmount).sales;
      const tax = pr.taxAmount && Number(pr.taxAmount) > 0 ? pr.taxAmount : splitTaxFromGross(pr.totalAmount).tax;
      mediaLines.push(
        buildMediaRow({
          formatCode: '23', // 進貨退出 / 折讓
          filerTaxId,
          sellerTaxId: (pr.supplier?.taxId || '').padStart(8, '0').slice(0, 8) || '00000000',
          buyerTaxId: filerTaxId,
          serialNo: ++serial,
          yyymm,
          salesAmount: sale,
          taxClass: '1',
          taxAmount: tax,
          deductionCode: '1',
        }),
      );
    }
    const mediaContent = mediaLines.join('\r\n') + (mediaLines.length > 0 ? '\r\n' : '');

    // 算主表彙整
    const sumSubtotal = (rows: Array<{ subtotal: PrismaNs.Decimal | null | undefined; totalAmount: PrismaNs.Decimal }>) =>
      rows.reduce((acc, r) => {
        const v = r.subtotal && Number(r.subtotal) > 0 ? r.subtotal : splitTaxFromGross(r.totalAmount).sales;
        return acc.plus(new PrismaNs.Decimal(v));
      }, new PrismaNs.Decimal(0));
    const sumTax = (rows: Array<{ taxAmount: PrismaNs.Decimal | null | undefined; totalAmount: PrismaNs.Decimal }>) =>
      rows.reduce((acc, r) => {
        const v = r.taxAmount && Number(r.taxAmount) > 0 ? r.taxAmount : splitTaxFromGross(r.totalAmount).tax;
        return acc.plus(new PrismaNs.Decimal(v));
      }, new PrismaNs.Decimal(0));

    const salesNet = sumSubtotal(sos).minus(sumSubtotal(srs));
    const outputTax = sumTax(sos).minus(sumTax(srs));
    const purchaseNet = sumSubtotal(rrs).minus(sumSubtotal(prs));
    const inputTax = sumTax(rrs).minus(sumTax(prs));
    const taxPayable = outputTax.minus(inputTax);

    const mainContent = buildMainForm({
      filerTaxId,
      filerName: tenant.name || '',
      yyymm,
      totalSalesTaxable: salesNet,
      totalSalesZero: 0,
      totalSalesExempt: 0,
      outputTax,
      inputTax,
      taxPayable,
    });

    return {
      reportPeriod: yp,
      mediaFileName: `${tenant.taxId}.TXT`,
      mediaContent: Buffer.from(mediaContent, 'ascii').toString('base64'),
      mediaLineCount: mediaLines.length,
      mainFileName: `${tenant.taxId}.TET_U`,
      mainContent: Buffer.from(mainContent, 'ascii').toString('base64'),
      summary: {
        salesNet: salesNet.toString(),
        outputTax: outputTax.toString(),
        purchaseNet: purchaseNet.toString(),
        inputTax: inputTax.toString(),
        taxPayable: taxPayable.toString(),
      },
      note: '401 主表為基礎版（112 欄完整對照列入後續軌）；進銷項資料檔 81 字元已對齊規範',
    };
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Closing.findFirst({
        where: { id, tenantId },
        select: { ...CL_SEL },
      });
      if (!existing) throw new NotFoundException('Period close not found');
      if (existing.status !== ClosingStatus.OPEN) {
        throw new BadRequestException('Only OPEN closing record can be deleted');
      }
      await tx.nx05Closing.delete({ where: { id } });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'DELETE',
        entityTable: 'nx05_closing',
        entityId: id,
        entityCode: existing.docNo,
        summary: '刪除關帳草稿',
        beforeData: existing as object,
      });
      return { ok: true, id };
    });
  }
}
