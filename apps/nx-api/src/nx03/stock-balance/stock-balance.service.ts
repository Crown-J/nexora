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
    if (q.status && q.status !== 'all') {
      // AUDIT-03 業務語意：in_stock=onHand>0、zero=onHand==0、negative=onHand<0
      if (q.status === 'in_stock') where.onHandQty = { gt: 0 };
      else if (q.status === 'zero') where.onHandQty = 0;
      else if (q.status === 'negative') where.onHandQty = { lt: 0 };
    }
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

  /**
   * 4 KPI summary（對齊 AUDIT-03 揭露舊版業務）：
   *   total / inStock / zero / negative
   * filter 範圍跟 list endpoint 相同（warehouseId / partId）、不套 status filter（會自我矛盾）。
   */
  async summary(user: RequestUser, q: Nx03StockBalanceListQueryDto) {
    const tenantId = requireTenantId(user);
    const baseWhere: Prisma.Nx03StockBalanceWhereInput = { tenantId };
    if (q.warehouseId?.trim()) baseWhere.warehouseId = q.warehouseId.trim();
    if (q.partId?.trim()) baseWhere.partId = q.partId.trim();
    const [total, inStock, zero, negative] = await Promise.all([
      this.prisma.nx03StockBalance.count({ where: baseWhere }),
      this.prisma.nx03StockBalance.count({ where: { ...baseWhere, onHandQty: { gt: 0 } } }),
      this.prisma.nx03StockBalance.count({ where: { ...baseWhere, onHandQty: 0 } }),
      this.prisma.nx03StockBalance.count({ where: { ...baseWhere, onHandQty: { lt: 0 } } }),
    ]);
    return { total, inStock, zero, negative };
  }

  /**
   * Dashboard hub KPI（4 KPI summary + 庫存總值 + 倉庫數）。
   * NX08 InventoryCache 重算 trigger 不在本軌範圍、totalStockValue 走 application 層即時 sum。
   * 低於安全量料號數待 PartStockSetting controller 落地後（Phase 2 commit 2）再補。
   */
  async dashboard(user: RequestUser, q: Nx03StockBalanceListQueryDto) {
    const tenantId = requireTenantId(user);
    const baseWhere: Prisma.Nx03StockBalanceWhereInput = { tenantId };
    if (q.warehouseId?.trim()) baseWhere.warehouseId = q.warehouseId.trim();
    const [summary, valueAgg, warehouseCount] = await Promise.all([
      this.summary(user, q),
      this.prisma.nx03StockBalance.aggregate({
        where: baseWhere,
        _sum: { stockValue: true },
      }),
      this.prisma.nx01Warehouse.count({ where: { tenantId, isActive: true } }),
    ]);
    return {
      summary,
      totalStockValue: valueAgg._sum.stockValue ?? 0,
      warehouseCount,
    };
  }
}
