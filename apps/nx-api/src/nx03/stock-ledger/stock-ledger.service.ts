import { Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx03LedgerListQueryDto } from '../../shared/nx03/nx03-ledger-list-query.dto';

const LED_SEL = {
  id: true,
  tenantId: true,
  movementDate: true,
  partId: true,
  warehouseId: true,
  locationId: true,
  movementType: true,
  qtyIn: true,
  qtyOut: true,
  unitCost: true,
  totalCost: true,
  balanceQty: true,
  balanceCost: true,
  sourceModule: true,
  sourceDocType: true,
  sourceDocId: true,
  sourceItemId: true,
  createdAt: true,
} as const;

@Injectable()
export class StockLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  private whereList(tenantId: string, q: Nx03LedgerListQueryDto): Prisma.Nx03StockLedgerWhereInput {
    const where: Prisma.Nx03StockLedgerWhereInput = { tenantId };
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    if (q.partId?.trim()) where.partId = q.partId.trim();
    if (q.sourceModule?.trim()) where.sourceModule = q.sourceModule.trim();
    if (q.sourceDocType?.trim()) where.sourceDocType = q.sourceDocType.trim();
    return where;
  }

  async list(user: RequestUser, q: Nx03LedgerListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03StockLedger.count({ where }),
      this.prisma.nx03StockLedger.findMany({
        where,
        orderBy: [{ movementDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...LED_SEL,
          part: { select: { code: true, name: true } },
          warehouse: { select: { code: true, name: true } },
          location: { select: { code: true, name: true } },
        },
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }
}
