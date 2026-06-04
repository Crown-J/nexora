import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx05DocNo, orgCodeFromDocNo } from '../../shared/nx05/nx05-doc-no';
import { applySettlementsForPaylog } from '../../shared/nx05/nx05-apply-settlements';
import { assertFinancePeriodMutable } from '../../shared/nx05/nx05-period-lock';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';
import {
  AllowanceApiStatus,
  AllowanceDbStatus,
  assertAllowanceApiStatusTransition,
} from '../../shared/nx05/nx05-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateAllowanceDto, PatchAllowanceDto } from './dto/allowance.dto';

const AL_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  allowanceType: true,
  partnerId: true,
  allowanceDate: true,
  refArId: true,
  refApId: true,
  totalAmount: true,
  status: true,
  approvedAt: true,
  approvedBy: true,
  rejectReason: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function toApiStatus(row: { status: string; rejectReason: string | null }): string {
  if (row.status === AllowanceDbStatus.VOIDED && row.rejectReason?.trim()) return AllowanceApiStatus.REJECTED;
  if (row.status === AllowanceDbStatus.APPROVED) return AllowanceApiStatus.APPROVED;
  if (row.status === AllowanceDbStatus.DRAFT) return AllowanceApiStatus.DRAFT;
  return row.status;
}

@Injectable()
export class AllowanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx05ListQueryDto): Prisma.Nx05AllowanceWhereInput {
    const parts: Prisma.Nx05AllowanceWhereInput[] = [{ tenantId }];
    const s = q.search?.trim();
    if (s) {
      parts.push({
        OR: [
          { docNo: { contains: s, mode: 'insensitive' } },
          { remark: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    const st = q.status?.trim();
    if (st === AllowanceApiStatus.REJECTED) {
      parts.push({ status: AllowanceDbStatus.VOIDED, rejectReason: { not: null } });
    } else if (st === AllowanceApiStatus.APPROVED) {
      parts.push({ status: AllowanceDbStatus.APPROVED });
    } else if (st === AllowanceApiStatus.DRAFT) {
      parts.push({ status: AllowanceDbStatus.DRAFT });
    } else if (st) {
      parts.push({ status: st });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx05ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx05Allowance.count({ where }),
      this.prisma.nx05Allowance.findMany({
        where,
        orderBy: [{ allowanceDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: AL_SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => ({ ...r, displayStatus: toApiStatus(r) })) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx05Allowance.findFirst({
      where: { id, tenantId },
      select: AL_SEL,
    });
    if (!row) throw new NotFoundException('Allowance not found');
    return { ...row, displayStatus: toApiStatus(row) };
  }

  async create(user: RequestUser, dto: CreateAllowanceDto) {
    const tenantId = requireTenantId(user);
    if (!dto.items?.length) throw new BadRequestException('items required');
    return this.prisma.$transaction(async (tx) => {
      const partner = await tx.nx01Partner.findFirst({
        where: { id: dto.partnerId, tenantId },
        select: { id: true },
      });
      if (!partner) throw new NotFoundException('partnerId not found');
      const ad = new Date(dto.allowanceDate);
      await assertFinancePeriodMutable(tx, tenantId, ad);
      if (dto.allowanceType === 'S' && !dto.refArId?.trim()) {
        throw new BadRequestException('refArId required for sales allowance');
      }
      if (dto.allowanceType === 'P' && !dto.refApId?.trim()) {
        throw new BadRequestException('refApId required for purchase allowance');
      }
      let total = new PrismaNs.Decimal(0);
      for (const it of dto.items) {
        total = total.add(new PrismaNs.Decimal(it.amount));
      }
      const docNo = await allocNx05DocNo(tx, tenantId, 'AL', 'HQ0');
      const head = await tx.nx05Allowance.create({
        data: {
          tenantId,
          docNo,
          allowanceType: dto.allowanceType.trim(),
          partnerId: dto.partnerId,
          allowanceDate: ad,
          refArId: dto.refArId?.trim() || null,
          refApId: dto.refApId?.trim() || null,
          totalAmount: total,
          status: AllowanceDbStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: AL_SEL,
      });
      let line = 1;
      for (const it of dto.items) {
        await tx.nx05AllowanceItem.create({
          data: {
            allowanceId: head.id,
            lineNo: line++,
            reason: it.reason.trim(),
            amount: new PrismaNs.Decimal(it.amount),
            disposalMethod: it.disposalMethod?.trim() || 'O',
            refDocId: it.refDocId?.trim() || null,
            refDocType: it.refDocType?.trim() || null,
            remark: it.remark?.trim() || null,
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
      }
      const row = await tx.nx05Allowance.findFirst({ where: { id: head.id, tenantId }, select: AL_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'CREATE',
        entityTable: 'nx05_allowance',
        entityId: head.id,
        entityCode: head.docNo,
        summary: '建立折讓單',
        afterData: row as object,
      });
      return { ...row!, displayStatus: toApiStatus(row!) };
    });
  }

  async patch(user: RequestUser, id: string, dto: PatchAllowanceDto) {
    const tenantId = requireTenantId(user);
    if (!dto.status) throw new BadRequestException('status is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Allowance.findFirst({
        where: { id, tenantId },
        select: { ...AL_SEL },
      });
      if (!existing) throw new NotFoundException('Allowance not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.allowanceDate));
      const fromApi = toApiStatus(existing);
      if (dto.status === fromApi) return { ...existing, displayStatus: fromApi };
      assertAllowanceApiStatusTransition(fromApi, dto.status!);

      if (dto.status === AllowanceApiStatus.APPROVED) {
        await tx.nx05Allowance.update({
          where: { id },
          data: {
            status: AllowanceDbStatus.APPROVED,
            approvedAt: new Date(),
            approvedBy: user.sub,
            rejectReason: null,
            updatedBy: user.sub,
          },
        });
      } else if (dto.status === AllowanceApiStatus.REJECTED) {
        if (!dto.rejectReason?.trim()) throw new BadRequestException('rejectReason required when rejecting');
        await tx.nx05Allowance.update({
          where: { id },
          data: {
            status: AllowanceDbStatus.VOIDED,
            rejectReason: dto.rejectReason.trim(),
            approvedAt: null,
            approvedBy: null,
            updatedBy: user.sub,
          },
        });
      }
      const row = await tx.nx05Allowance.findFirst({ where: { id, tenantId }, select: AL_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_allowance',
        entityId: id,
        entityCode: existing.docNo,
        summary: `折讓 ${fromApi} -> ${dto.status}`,
        beforeData: existing as object,
        afterData: row as object,
      });
      return { ...row!, displayStatus: toApiStatus(row!) };
    });
  }

  // ────────────────────────────────────────────────────────────
  // v1.2 階段 F P5 E：折讓人工沖銷（主管核可流程）
  // ────────────────────────────────────────────────────────────

  /**
   * 人工開折讓（DRAFT）：財務員自己開一張折讓單、等主管核可。
   * 對齊意圖書 E③=B「折讓需主管核可才生效（防亂打折少收）」。
   *
   * - allowanceType='S' → 銷貨折讓（refArId 必填、降低應收）
   * - allowanceType='P' → 進貨折讓（refApId 必填、降低應付）
   * - 建 DRAFT 狀態、approve 才寫沖銷
   */
  async createManual(
    user: RequestUser,
    dto: {
      allowanceType: 'P' | 'S';
      partnerId: string;
      allowanceDate: string;
      totalAmount: number | string;
      refArId?: string;
      refApId?: string;
      remark?: string;
    },
  ) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      // 業務校驗：S 必填 refArId、P 必填 refApId
      if (dto.allowanceType === 'S' && !dto.refArId) {
        throw new BadRequestException('銷貨折讓必填 refArId');
      }
      if (dto.allowanceType === 'P' && !dto.refApId) {
        throw new BadRequestException('進貨折讓必填 refApId');
      }
      const date = new Date(dto.allowanceDate);
      await assertFinancePeriodMutable(tx, tenantId, date);

      const docNo = await allocNx05DocNo(tx, tenantId, 'AL', 'HQ0');
      const row = await tx.nx05Allowance.create({
        data: {
          tenantId,
          docNo,
          allowanceType: dto.allowanceType,
          partnerId: dto.partnerId,
          allowanceDate: date,
          refArId: dto.refArId ?? null,
          refApId: dto.refApId ?? null,
          totalAmount: new PrismaNs.Decimal(dto.totalAmount),
          status: AllowanceDbStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true, docNo: true },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'CREATE',
        entityTable: 'nx05_allowance',
        entityId: row.id,
        entityCode: row.docNo,
        summary: `人工開立折讓單 (${dto.allowanceType}) 待主管核可`,
      });
      return { id: row.id, docNo: row.docNo };
    });
  }

  /**
   * 主管核可折讓：DRAFT → APPROVED + 寫 paylog + settlement 沖對應 AR/AP。
   *
   * 對齊意圖書 E③=B「核可後才寫沖銷、扣 AR/AP 餘額」。
   * 核可流程同時建一筆 paylog（payType='AL'）+ 一筆 settlement 沖。
   */
  async approve(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Allowance.findFirst({
        where: { id, tenantId },
        select: { ...AL_SEL },
      });
      if (!existing) throw new NotFoundException('Allowance not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.allowanceDate));
      if (existing.status !== AllowanceDbStatus.DRAFT) {
        throw new BadRequestException('只有 DRAFT 折讓單可核可');
      }
      // 標 APPROVED + 寫 approvedAt/By
      await tx.nx05Allowance.update({
        where: { id },
        data: {
          status: AllowanceDbStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: user.sub,
          updatedBy: user.sub,
        },
      });

      // 建 paylog（折讓沖銷）+ settlement 自動沖 AR/AP
      // 折讓沖銷：S 銷貨折讓→ 'RC' kind（客戶退款）/ P 進貨折讓 → 'CP' kind（廠商退款）
      const docNo = await allocNx05DocNo(
        tx,
        tenantId,
        existing.allowanceType === 'S' ? 'RC' : 'CP',
        orgCodeFromDocNo(existing.docNo),
      );
      // [BUG #4 真因 fix] currencyId 必須是 nx01_currency.id（如 NX01CURR0000001）、不是 code 'TWD'
      const twd = await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });
      if (!twd) throw new BadRequestException('預設幣別 TWD 未在 nx01_currency seed、無法建折讓沖銷單');
      const paylog = await tx.nx05Paylog.create({
        data: {
          tenantId,
          docNo,
          payType: existing.allowanceType === 'S' ? 'RC' : 'RR', // RC=客戶退款 / RR=廠商退款（折讓視為退款型沖銷）
          payDate: new Date(existing.allowanceDate),
          partnerId: existing.partnerId,
          arId: existing.refArId,
          apId: existing.refApId,
          amount: new PrismaNs.Decimal(existing.totalAmount),
          currencyId: twd.id,
          payMethod: 'AL', // AL=折讓（非標準 4 種、用 'AL' 標示「折讓沖銷」）
          status: 'POSTED',
          postedAt: new Date(),
          remark: `折讓沖銷 ${existing.docNo}`,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true },
      });
      await applySettlementsForPaylog(tx, {
        tenantId,
        paylogId: paylog.id,
        userId: user.sub,
        settlements: [
          {
            arId: existing.refArId,
            apId: existing.refApId,
            settledAmount: existing.totalAmount,
            remark: `折讓 ${existing.docNo}`,
          },
        ],
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_allowance',
        entityId: id,
        entityCode: existing.docNo,
        summary: `折讓核可、自動沖 ${existing.refArId ? 'AR' : 'AP'} ${existing.totalAmount.toString()}`,
      });
      return { id, status: AllowanceDbStatus.APPROVED };
    });
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Allowance.findFirst({
        where: { id, tenantId },
        select: { ...AL_SEL },
      });
      if (!existing) throw new NotFoundException('Allowance not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.allowanceDate));
      if (existing.status !== AllowanceDbStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT allowance can be void-deleted');
      }
      await tx.nx05AllowanceItem.deleteMany({ where: { allowanceId: id } });
      await tx.nx05Allowance.delete({ where: { id } });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'DELETE',
        entityTable: 'nx05_allowance',
        entityId: id,
        entityCode: existing.docNo,
        summary: '刪除折讓草稿',
        beforeData: existing as object,
      });
      return { ok: true, id };
    });
  }
}
