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
import { effectiveApStatus } from '../../shared/nx05/nx05-ar-display';
import { assertFinancePeriodMutable } from '../../shared/nx05/nx05-period-lock';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';
import { ApStatus, assertApStatusTransition } from '../../shared/nx05/nx05-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { PatchApDto } from './dto/ap.dto';

const AP_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  sourceType: true,
  poId: true,
  rrId: true,
  tiId: true,
  supplierId: true,
  billToPartnerId: true,
  apDate: true,
  dueDate: true,
  currencyId: true,
  originalAmount: true,
  paidAmount: true,
  balanceAmount: true,
  status: true,
  paymentTerm: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ApService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx05ListQueryDto): Prisma.Nx05ApLedgerWhereInput {
    const parts: Prisma.Nx05ApLedgerWhereInput[] = [{ tenantId }];
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
    const t0 = startOfToday();
    if (st === 'OVERDUE') {
      parts.push({
        OR: [
          { AND: [{ status: 'OPEN' }, { dueDate: { lt: t0 } }] },
          { AND: [{ status: 'PARTIAL' }, { dueDate: { lt: t0 } }] },
        ],
      });
    } else if (st === 'OPEN') {
      parts.push({ status: 'OPEN' }, { dueDate: { gte: t0 } });
    } else if (st) {
      parts.push({ status: st });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  private mapRow(row: Prisma.Nx05ApLedgerGetPayload<{ select: typeof AP_SEL }>) {
    return { ...row, displayStatus: effectiveApStatus(row.status, new Date(row.dueDate)) };
  }

  async list(user: RequestUser, q: Nx05ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx05ApLedger.count({ where }),
      this.prisma.nx05ApLedger.findMany({
        where,
        orderBy: [{ apDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: AP_SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  /**
   * v1.2 階段 F P3 G：應付彙整視圖（ApLedger + 銷退衍生 Allowance）
   *
   * 對齊：
   *   - 意圖書 §3.1 應付來源 = 採購單（廠商確認）+ 銷退單
   *   - Alex Q2=(b)：不動既有 Allowance 寫入邏輯、查詢層 join 顯示
   *
   * 業務語意：
   *   - 採購應付 → ApLedger row（既有 createApFromConfirmedPo / createApFromRr）
   *   - 銷退應付 → Allowance allowanceType='S'（既有 createAllowanceFromSr、客戶退錢需求）
   *
   * 回傳統一視圖（兩種來源 union）：
   *   { kind: 'AP', ...ApLedger }
   *   { kind: 'SR_ALLOWANCE', ...Allowance（attached partner / refAr）}
   *
   * 注意：本視圖不分頁、彙整目的（前端依需要過濾）；分頁需求走原 list endpoint。
   */
  async listPayableView(user: RequestUser, q: Nx05ListQueryDto) {
    const tenantId = requireTenantId(user);
    const apWhere = this.whereList(tenantId, q);
    const [aps, srAllowances] = await Promise.all([
      this.prisma.nx05ApLedger.findMany({
        where: apWhere,
        orderBy: [{ apDate: 'desc' }, { docNo: 'desc' }],
        select: AP_SEL,
      }),
      this.prisma.nx05Allowance.findMany({
        where: {
          tenantId,
          allowanceType: 'S', // 銷貨折讓（含銷退退款給客戶）
          status: { in: ['APPROVED', 'A'] }, // 已核准（DB 兩階段範式：D draft / A approved）
        },
        select: {
          id: true,
          docNo: true,
          allowanceDate: true,
          partnerId: true,
          refArId: true,
          totalAmount: true,
          status: true,
          remark: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ allowanceDate: 'desc' }],
      }),
    ]);
    return {
      ap: aps.map((r) => ({ kind: 'AP' as const, ...this.mapRow(r) })),
      srAllowance: srAllowances.map((r) => ({
        kind: 'SR_ALLOWANCE' as const,
        id: r.id,
        docNo: r.docNo,
        date: r.allowanceDate,
        partnerId: r.partnerId,
        refArId: r.refArId,
        amount: r.totalAmount,
        status: r.status,
        remark: r.remark,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      totalCount: aps.length + srAllowances.length,
      note: '本視圖彙總「採購單應付」（ApLedger）+「銷退退款」（Allowance type=S、已核准）兩種應付來源',
    };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx05ApLedger.findFirst({
      where: { id, tenantId },
      select: AP_SEL,
    });
    if (!row) throw new NotFoundException('AP not found');
    return this.mapRow(row);
  }

  /**
   * v1.2 階段 F P5-B (4)：列出一張 AP 的所有 settlement 沖銷歷史
   */
  async listSettlements(user: RequestUser, apId: string) {
    const tenantId = requireTenantId(user);
    const ap = await this.prisma.nx05ApLedger.findFirst({
      where: { id: apId, tenantId },
      select: { id: true, originalAmount: true, paidAmount: true, balanceAmount: true },
    });
    if (!ap) throw new NotFoundException('AP not found');
    const settlements = await this.prisma.nx05PaylogSettlement.findMany({
      where: { tenantId, apId },
      select: {
        id: true,
        paylogId: true,
        settledAmount: true,
        remark: true,
        createdAt: true,
        paylog: {
          select: {
            docNo: true,
            payDate: true,
            payMethod: true,
            payType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const rows = settlements.map((s) => ({
      id: s.id,
      paylogId: s.paylogId,
      paylogDocNo: s.paylog?.docNo ?? '',
      paylogPayDate: s.paylog?.payDate ?? null,
      paylogPayMethod: s.paylog?.payMethod ?? '',
      paylogPayType: s.paylog?.payType ?? '',
      settledAmount: s.settledAmount.toString(),
      remark: s.remark,
      createdAt: s.createdAt,
    }));
    return {
      rows,
      totalSettled: ap.paidAmount.toString(),
      originalAmount: ap.originalAmount.toString(),
      balanceAmount: ap.balanceAmount.toString(),
    };
  }

  async patch(user: RequestUser, id: string, dto: PatchApDto) {
    const tenantId = requireTenantId(user);
    if (!dto.status) throw new BadRequestException('status is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05ApLedger.findFirst({
        where: { id, tenantId },
        select: { ...AP_SEL },
      });
      if (!existing) throw new NotFoundException('AP not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.apDate));
      if (dto.status === existing.status) return this.mapRow(existing);
      assertApStatusTransition(existing.status, dto.status!);
      await tx.nx05ApLedger.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === ApStatus.VOID
            ? { writeOffAt: new Date(), writeOffBy: user.sub }
            : {}),
          updatedBy: user.sub,
        },
      });
      const row = await tx.nx05ApLedger.findFirst({ where: { id, tenantId }, select: AP_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_ap_ledger',
        entityId: id,
        entityCode: existing.docNo,
        summary: `AP 狀態 ${existing.status} -> ${dto.status}`,
        beforeData: existing as object,
        afterData: row as object,
      });
      return this.mapRow(row!);
    });
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05ApLedger.findFirst({
        where: { id, tenantId },
        select: { ...AP_SEL },
      });
      if (!existing) throw new NotFoundException('AP not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.apDate));
      if (!new PrismaNs.Decimal(existing.paidAmount).eq(0)) {
        throw new BadRequestException('Cannot void AP with payments; void payments first');
      }
      assertApStatusTransition(existing.status, ApStatus.VOID);
      await tx.nx05ApLedger.update({
        where: { id },
        data: {
          status: ApStatus.VOID,
          writeOffAt: new Date(),
          writeOffBy: user.sub,
          updatedBy: user.sub,
        },
      });
      const row = await tx.nx05ApLedger.findFirst({ where: { id, tenantId }, select: AP_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'DELETE',
        entityTable: 'nx05_ap_ledger',
        entityId: id,
        entityCode: existing.docNo,
        summary: '應付作廢(VOID)',
        beforeData: existing as object,
        afterData: row as object,
      });
      return this.mapRow(row!);
    });
  }
}
