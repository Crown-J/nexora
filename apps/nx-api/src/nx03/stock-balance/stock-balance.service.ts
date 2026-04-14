import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx03StockBalanceListQueryDto } from '../../shared/nx03/nx03-stock-balance-list-query.dto';

const BAL_SEL = {
  id: true,
  tenantId: true,
  partId: true,
  warehouseId: true,
  onHandQty: true,
  reservedQty: true,
  availableQty: true,
  inTransitQty: true,
  avgCost: true,
  stockValue: true,
  lastInAt: true,
  lastOutAt: true,
  lastMoveAt: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class StockBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  private whereList(tenantId: string, q: Nx03StockBalanceListQueryDto): Prisma.Nx03StockBalanceWhereInput {
    const where: Prisma.Nx03StockBalanceWhereInput = { tenantId };
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    if (q.partId?.trim()) where.partId = q.partId.trim();
    return where;
  }

  async list(user: RequestUser, q: Nx03StockBalanceListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03StockBalance.count({ where }),
      this.prisma.nx03StockBalance.findMany({
        where,
        orderBy: [{ warehouseId: 'asc' }, { partId: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...BAL_SEL,
          part: { select: { code: true, name: true } },
          warehouse: { select: { code: true, name: true } },
        },
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  /** 單一料號於各倉庫之庫存 */
  async listByPart(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const part = await this.prisma.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { id: true, code: true, name: true },
    });
    if (!part) throw new NotFoundException('Part not found');
    const rows = await this.prisma.nx03StockBalance.findMany({
      where: { tenantId, partId },
      orderBy: { warehouseId: 'asc' },
      select: {
        ...BAL_SEL,
        warehouse: { select: { code: true, name: true } },
      },
    });
    return { part, items: rows };
  }
}
