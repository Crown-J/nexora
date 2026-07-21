// apps/nx-api/src/nx02/warranty-claim/warranty-claim.service.ts
// LITE 階段 1 M2-d：保固申請單 service。
//
// 業務語意：
//   - 兩型發起：CUST 客訴型（sourceSoId 必填、SO LITE 還沒做 = 暫不建 FK 約束、純預留）/ SELF 自用型
//   - status 流轉：D=DRAFT → S=SUBMITTED → R=REVIEWING → C=COMPLETED 或 V=VOIDED
//   - result 4 種：NEW=換新 / REF=退錢 / RPR=維修後還 / REJ=駁回
//   - 純供應商 partner_type='S' guard（application 層提示性）

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { allocDocNo } from '../../shared/nx02/nx02-doc-no';
import { closeIssueReportFromDisposition } from '../../shared/nx03/nx03-issue-report-close';
import { allocNx05DocNo } from '../../shared/nx05/nx05-doc-no';
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { assertPurchasable } from '../../shared/nx01/partner-account-gate';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateWarrantyClaimDto,
  ListWarrantyClaimQueryDto,
  RegisterResultDto,
  UpdateWarrantyClaimDto,
} from './dto/warranty-claim.dto';

const SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  claimType: true,
  sourceSoId: true,
  sourceSoNo: true,
  supplierId: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  claimDate: true,
  issueDescription: true,
  status: true,
  result: true,
  resultRemark: true,
  resultedAt: true,
  resultedBy: true,
  // W5 異常鏈 Step 3 2026-07-11：來源異常回報單（審核完成回寫結案用）
  sourceIssueReportId: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  voidedAt: true,
  voidedBy: true,
  supplier: { select: { code: true, name: true, partnerType: true } },
  part: { select: { code: true, name: true } },
} as const;

const STATUS_DRAFT = 'D';
const STATUS_SUBMITTED = 'S';
const STATUS_REVIEWING = 'R';
const STATUS_COMPLETED = 'C';
const STATUS_VOIDED = 'V';

@Injectable()
export class WarrantyClaimService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(
    tenantId: string,
    q: ListWarrantyClaimQueryDto,
  ): Prisma.Nx02WarrantyClaimWhereInput {
    const where: Prisma.Nx02WarrantyClaimWhereInput = { tenantId };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.supplierId?.trim()) where.supplierId = q.supplierId.trim();
    if (q.partId?.trim()) where.partId = q.partId.trim();
    if (q.claimType?.trim()) where.claimType = q.claimType.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { partNo: { contains: s, mode: 'insensitive' } },
        { partName: { contains: s, mode: 'insensitive' } },
        { issueDescription: { contains: s, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  /// 站 5 即時銷退・保固步驟（執行長 2026-07-19 拍板）：建議供應商＝該料最近一次進貨（RR）供應商。
  /// 零件主檔無預設供應商欄、以進貨事實推定；查無進貨紀錄回 null（前端改手選）。
  async suggestSupplier(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    if (!partId?.trim()) throw new BadRequestException('partId is required');
    const row = await this.prisma.nx02RrItem.findFirst({
      where: { partId: partId.trim(), rr: { tenantId } },
      orderBy: { createdAt: 'desc' },
      select: {
        rr: {
          select: {
            docNo: true,
            supplierId: true,
            supplier: { select: { code: true, name: true } },
          },
        },
      },
    });
    if (!row) return null;
    return {
      supplierId: row.rr.supplierId,
      supplierCode: row.rr.supplier.code,
      supplierName: row.rr.supplier.name,
      sourceRrDocNo: row.rr.docNo,
    };
  }

  async list(user: RequestUser, q: ListWarrantyClaimQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx02WarrantyClaim.count({ where }),
      this.prisma.nx02WarrantyClaim.findMany({
        where,
        orderBy: [{ claimDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02WarrantyClaim.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Warranty claim not found');
    return row;
  }

  /** 純供應商 guard（partner_type='S'）。partner 改制六分類後 S=純供應商。 */
  private async assertSupplier(
    tx: Prisma.TransactionClient,
    tenantId: string,
    supplierId: string,
  ): Promise<void> {
    const p = await tx.nx01Partner.findFirst({
      where: { id: supplierId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!p) throw new BadRequestException(`supplierId not found or inactive`);
    // 帳戶閘門 v1.3：向廠商保固=採購域、持有 P 進貨付款帳戶（取代舊 partner_type='S' 判斷）
    await assertPurchasable(tx, tenantId, supplierId);
  }

  async create(user: RequestUser, dto: CreateWarrantyClaimDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      // claimType guard
      if (dto.claimType === 'CUST' && !dto.sourceSoId?.trim()) {
        throw new BadRequestException('claimType=CUST 客訴型必須帶 sourceSoId（連結當初銷貨單）');
      }
      if (dto.claimType === 'SELF' && dto.sourceSoId?.trim()) {
        throw new BadRequestException('claimType=SELF 自用型不可帶 sourceSoId');
      }

      // 純供應商 guard
      await this.assertSupplier(tx, tenantId, dto.supplierId.trim());

      // load part snapshot
      const part = await tx.nx01Part.findFirst({
        where: { id: dto.partId.trim(), tenantId },
        select: { code: true, name: true },
      });
      if (!part) throw new NotFoundException(`partId not found in tenant`);

      // docNo 用機構碼 HQ0（保固單跨倉、無倉概念、對齊 NX02 既有 doc-no 範式）
      const docNo = await allocDocNo(tx, tenantId, 'WC', 'HQ0');

      const created = await tx.nx02WarrantyClaim.create({
        data: {
          tenantId,
          docNo,
          claimType: dto.claimType,
          sourceSoId: dto.sourceSoId?.trim() || null,
          sourceSoNo: dto.sourceSoNo?.trim() || null,
          supplierId: dto.supplierId.trim(),
          partId: dto.partId.trim(),
          partNo: part.code,
          partName: part.name,
          qty: new Prisma.Decimal(dto.qty),
          claimDate: new Date(dto.claimDate),
          issueDescription: dto.issueDescription.trim(),
          status: STATUS_DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'CREATE',
        entityTable: 'nx02_warranty_claim',
        entityId: created.id,
        entityCode: created.docNo,
        summary: `建立保固申請單（${dto.claimType === 'CUST' ? '客訴型' : '自用型'}）`,
        afterData: created as object,
      });
      return created;
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateWarrantyClaimDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02WarrantyClaim.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Warranty claim not found');
    if (existing.status !== STATUS_DRAFT) {
      throw new BadRequestException(`Cannot edit warranty claim in status '${existing.status}' (only DRAFT editable)`);
    }
    if (existing.voidedAt) throw new BadRequestException('Warranty claim already voided');

    return this.prisma.$transaction(async (tx) => {
      // part snapshot 改變時重抓
      let partSnap: { partNo?: string; partName?: string } = {};
      if (dto.partId?.trim() && dto.partId.trim() !== existing.partId) {
        const part = await tx.nx01Part.findFirst({
          where: { id: dto.partId.trim(), tenantId },
          select: { code: true, name: true },
        });
        if (!part) throw new NotFoundException(`partId not found in tenant`);
        partSnap = { partNo: part.code, partName: part.name };
      }
      // supplier guard
      if (dto.supplierId?.trim() && dto.supplierId.trim() !== existing.supplierId) {
        await this.assertSupplier(tx, tenantId, dto.supplierId.trim());
      }
      const row = await tx.nx02WarrantyClaim.update({
        where: { id },
        data: {
          ...(dto.sourceSoId !== undefined ? { sourceSoId: dto.sourceSoId?.trim() || null } : {}),
          ...(dto.sourceSoNo !== undefined ? { sourceSoNo: dto.sourceSoNo?.trim() || null } : {}),
          ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId.trim() } : {}),
          ...(dto.partId !== undefined ? { partId: dto.partId.trim() } : {}),
          ...(partSnap.partNo !== undefined ? { partNo: partSnap.partNo, partName: partSnap.partName } : {}),
          ...(dto.qty !== undefined ? { qty: new Prisma.Decimal(dto.qty) } : {}),
          ...(dto.claimDate !== undefined ? { claimDate: new Date(dto.claimDate) } : {}),
          ...(dto.issueDescription !== undefined ? { issueDescription: dto.issueDescription.trim() } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          updatedBy: user.sub,
        },
        select: SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'UPDATE',
        entityTable: 'nx02_warranty_claim',
        entityId: id,
        entityCode: row.docNo,
        summary: '修改保固申請單',
        beforeData: existing as object,
        afterData: row as object,
      });
      return row;
    });
  }

  /** D→S 送出 */
  async submit(user: RequestUser, id: string) {
    return this.transitStatus(user, id, STATUS_DRAFT, STATUS_SUBMITTED, '送出');
  }

  /** S→R 進入審核（業務人員聯絡供應商後標記） */
  async startReview(user: RequestUser, id: string) {
    return this.transitStatus(user, id, STATUS_SUBMITTED, STATUS_REVIEWING, '進入審核');
  }

  /**
   * R→C 登記審核結果 + 4 種 result
   *
   * v1.2 階段 F P5 D（總經理 2026-06-01 拍板）：
   *   result='REF' 退錢時、必填 refundAmount + refundMethod，三方式分流：
   *     - O = Offset    下次付款扣抵（純記錄、不沖、業務下次採購時手動扣）
   *     - A = Allowance 自動開折讓單 DRAFT（待主管核可、走 nx05 allowance approve 流程）
   *     - R = Refund    直接匯款退現（純記錄、業務用 nx05 paylog/with-settlements 開付款選沖 AP）
   */
  async registerResult(user: RequestUser, id: string, dto: RegisterResultDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02WarrantyClaim.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Warranty claim not found');
    if (existing.status !== STATUS_REVIEWING) {
      throw new ConflictException(`registerResult requires status='${STATUS_REVIEWING}' REVIEWING, got '${existing.status}'`);
    }
    // v1.2 階段 F P5 D：result='REF' 退錢必填金額 + 方式
    if (dto.result === 'REF') {
      if (dto.refundAmount == null || dto.refundAmount <= 0) {
        throw new BadRequestException('退錢（REF）必填退款金額 refundAmount > 0');
      }
      if (!dto.refundMethod) {
        throw new BadRequestException(
          '退錢（REF）必填退款方式 refundMethod（O=下次扣抵 / A=折讓單 / R=直接退現）',
        );
      }
    }
    const row = await this.prisma.nx02WarrantyClaim.update({
      where: { id },
      data: {
        status: STATUS_COMPLETED,
        result: dto.result,
        resultRemark: dto.resultRemark.trim(),
        resultedAt: new Date(),
        resultedBy: user.sub,
        // v1.2 階段 F P5 D：REF 時寫入金額+方式、其他 result 為 null
        refundAmount:
          dto.result === 'REF' && dto.refundAmount != null
            ? new PrismaNs.Decimal(dto.refundAmount)
            : null,
        refundMethod: dto.result === 'REF' ? dto.refundMethod ?? null : null,
        updatedBy: user.sub,
      },
      select: SEL,
    });

    // v1.2 階段 F P5 D：refundMethod='A' 折讓單方式 → 自動建 DRAFT Allowance（沖 AP）
    // 其他方式（O 下次扣抵 / R 直接退現）純記錄、不寫沖銷（業務手動走 paylog 或下次採購扣）
    if (dto.result === 'REF' && dto.refundMethod === 'A') {
      // 找對應 AP（依 supplierId 找最近一筆未結清的 AP）
      const refAp = await this.prisma.nx05ApLedger.findFirst({
        where: {
          tenantId,
          supplierId: existing.supplierId,
          balanceAmount: { gt: 0 },
        },
        orderBy: { apDate: 'desc' },
        select: { id: true },
      });
      const allowanceDocNo = await allocNx05DocNo(this.prisma, tenantId, 'AL', 'HQ0');
      await this.prisma.nx05Allowance.create({
        data: {
          tenantId,
          docNo: allowanceDocNo,
          allowanceType: 'P', // 進貨折讓（廠商給我方）
          partnerId: existing.supplierId,
          allowanceDate: new Date(),
          refApId: refAp?.id ?? null,
          totalAmount: new PrismaNs.Decimal(dto.refundAmount!),
          status: 'DRAFT',
          remark: `保固理賠折讓 來自 ${existing.docNo}`,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
      });
    }

    // W5 異常鏈 Step 3 2026-07-11：保固審核完成（status=C、含 REJ 駁回 = 處置結果確定）
    // → 來源異常單回寫自動結案（結果細節留在保固單、IR 結案備註記單號）
    if (existing.sourceIssueReportId) {
      await closeIssueReportFromDisposition(this.prisma, {
        tenantId,
        issueReportId: existing.sourceIssueReportId,
        dispositionDocNo: existing.docNo,
        userId: user.sub,
      });
    }

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_warranty_claim',
      entityId: id,
      entityCode: row.docNo,
      summary:
        dto.result === 'REF'
          ? `保固審核 → REF 退錢 ${dto.refundAmount} 方式 ${dto.refundMethod}（${this.refundMethodLabel(dto.refundMethod!)}）`
          : `登記保固審核結果 → ${dto.result}（${this.resultLabel(dto.result)}）`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  private refundMethodLabel(m: string): string {
    return { O: '下次扣抵', A: '折讓單', R: '直接退現' }[m] ?? m;
  }

  /** V 作廢（DRAFT / SUBMITTED / REVIEWING 都可作廢；COMPLETED 不能） */
  async voidClaim(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02WarrantyClaim.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Warranty claim not found');
    if (existing.status === STATUS_VOIDED) throw new ConflictException('Warranty claim already voided');
    if (existing.status === STATUS_COMPLETED) {
      throw new BadRequestException('Cannot void completed warranty claim');
    }
    const row = await this.prisma.nx02WarrantyClaim.update({
      where: { id },
      data: {
        status: STATUS_VOIDED,
        voidedAt: new Date(),
        voidedBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_warranty_claim',
      entityId: id,
      entityCode: row.docNo,
      summary: '作廢保固申請單',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  private async transitStatus(
    user: RequestUser,
    id: string,
    fromStatus: string,
    toStatus: string,
    action: string,
  ) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02WarrantyClaim.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Warranty claim not found');
    if (existing.status !== fromStatus) {
      throw new ConflictException(
        `Cannot ${action}: current status='${existing.status}', expected='${fromStatus}'`,
      );
    }
    const row = await this.prisma.nx02WarrantyClaim.update({
      where: { id },
      data: { status: toStatus, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_warranty_claim',
      entityId: id,
      entityCode: row.docNo,
      summary: `保固申請單${action}（${fromStatus} → ${toStatus}）`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  private resultLabel(r: string): string {
    return { NEW: '換新', REF: '退錢', RPR: '維修後還', REJ: '駁回' }[r] ?? r;
  }
}
