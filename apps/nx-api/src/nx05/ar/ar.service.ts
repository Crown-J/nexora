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
import { createArFromShippedSo } from '../../shared/nx05/nx05-create-ar-from-so';
import { effectiveArStatus } from '../../shared/nx05/nx05-ar-display';
import { assertFinancePeriodMutable } from '../../shared/nx05/nx05-period-lock';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';
import { ArStatus, assertArStatusTransition } from '../../shared/nx05/nx05-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateArDto, PatchArDto } from './dto/ar.dto';

const AR_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  soId: true,
  customerId: true,
  arDate: true,
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
export class ArService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx05ListQueryDto): Prisma.Nx05ArLedgerWhereInput {
    const parts: Prisma.Nx05ArLedgerWhereInput[] = [{ tenantId }];
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

  private mapRow(row: Prisma.Nx05ArLedgerGetPayload<{ select: typeof AR_SEL }>) {
    const displayStatus = effectiveArStatus(row.status, new Date(row.dueDate));
    return { ...row, displayStatus };
  }

  async list(user: RequestUser, q: Nx05ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx05ArLedger.count({ where }),
      this.prisma.nx05ArLedger.findMany({
        where,
        orderBy: [{ arDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: AR_SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx05ArLedger.findFirst({
      where: { id, tenantId },
      select: AR_SEL,
    });
    if (!row) throw new NotFoundException('AR not found');
    return this.mapRow(row);
  }

  /** 手動由 SO 建立應收（SO 須未取消；冪等）。 */
  async create(user: RequestUser, dto: CreateArDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const so = await tx.nx04So.findFirst({
        where: { id: dto.soId, tenantId, cancelledAt: null },
        select: { soDate: true },
      });
      if (!so) throw new NotFoundException('SO not found or cancelled');
      await assertFinancePeriodMutable(tx, tenantId, new Date(so.soDate));
      const arId = await createArFromShippedSo(tx, { tenantId, soId: dto.soId, userId: user.sub });
      if (!arId) throw new BadRequestException('Could not create AR from SO');
      const row = await tx.nx05ArLedger.findFirst({
        where: { id: arId, tenantId },
        select: AR_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'CREATE',
        entityTable: 'nx05_ar_ledger',
        entityId: arId,
        entityCode: row?.docNo ?? null,
        summary: '建立應收帳款',
        afterData: row as object,
      });
      return this.mapRow(row!);
    });
  }

  async patch(user: RequestUser, id: string, dto: PatchArDto) {
    const tenantId = requireTenantId(user);
    if (!dto.status) throw new BadRequestException('status is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05ArLedger.findFirst({
        where: { id, tenantId },
        select: { ...AR_SEL },
      });
      if (!existing) throw new NotFoundException('AR not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.arDate));
      if (dto.status === existing.status) return this.mapRow(existing);
      assertArStatusTransition(existing.status, dto.status!);
      await tx.nx05ArLedger.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === ArStatus.WRITTEN_OFF
            ? { writeOffAt: new Date(), writeOffBy: user.sub }
            : {}),
          updatedBy: user.sub,
        },
      });
      const row = await tx.nx05ArLedger.findFirst({ where: { id, tenantId }, select: AR_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_ar_ledger',
        entityId: id,
        entityCode: existing.docNo,
        summary: `AR 狀態 ${existing.status} -> ${dto.status}`,
        beforeData: existing as object,
        afterData: row as object,
      });
      return this.mapRow(row!);
    });
  }

  /** 作廢：僅允許沖帳（WRITTEN_OFF）且無已收金額。 */
  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05ArLedger.findFirst({
        where: { id, tenantId },
        select: { ...AR_SEL },
      });
      if (!existing) throw new NotFoundException('AR not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.arDate));
      if (!new PrismaNs.Decimal(existing.paidAmount).eq(0)) {
        throw new BadRequestException('Cannot void AR with receipts; void receipts first');
      }
      assertArStatusTransition(existing.status, ArStatus.WRITTEN_OFF);
      await tx.nx05ArLedger.update({
        where: { id },
        data: {
          status: ArStatus.WRITTEN_OFF,
          writeOffAt: new Date(),
          writeOffBy: user.sub,
          updatedBy: user.sub,
        },
      });
      const row = await tx.nx05ArLedger.findFirst({ where: { id, tenantId }, select: AR_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'DELETE',
        entityTable: 'nx05_ar_ledger',
        entityId: id,
        entityCode: existing.docNo,
        summary: '應收沖帳作廢(WRITTEN_OFF)',
        beforeData: existing as object,
        afterData: row as object,
      });
      return this.mapRow(row!);
    });
  }
}
