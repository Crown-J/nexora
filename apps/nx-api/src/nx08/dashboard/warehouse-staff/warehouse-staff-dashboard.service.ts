// apps/nx-api/src/nx08/dashboard/warehouse-staff/warehouse-staff-dashboard.service.ts
// NX08 倉管 dashboard service（即時 SQL 聚合）
//
// 對齊：overview v0.1.0 §3.1 倉管 #4~#6 + audit-01 §6.2
// 3 method：turnover（周轉率）/ dormant（滯銷）/ lowStockAlert（缺貨警示）

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireTenantId } from '../../../shared/nx01/require-tenant';

@Injectable()
export class Nx08WarehouseStaffDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** 庫存周轉率（top 10 by ledger out qty / current balance）。 */
  async turnover(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000);
    const out = await this.prisma.nx03StockLedger.groupBy({
      by: ['partId', 'warehouseId'],
      where: { tenantId, qtyOut: { gt: 0 }, createdAt: { gte: thirtyDaysAgo } },
      _sum: { qtyOut: true },
      orderBy: { _sum: { qtyOut: 'desc' } },
      take: 50,
    });
    return { ok: true, period: '30d', topOutPart: out.slice(0, 10) };
  }

  /** 滯銷品警示（90 天無出貨 + 有庫存）。 */
  async dormant(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400 * 1000);
    const dormants = await this.prisma.nx03StockBalance.findMany({
      where: {
        tenantId,
        onHandQty: { gt: 0 },
        part: { rev_Nx03StockLedger_partId: { none: { qtyOut: { gt: 0 }, createdAt: { gte: ninetyDaysAgo } } } },
      },
      take: 20,
      select: { partId: true, warehouseId: true, onHandQty: true, avgCost: true },
      orderBy: { onHandQty: 'desc' },
    });
    return { ok: true, dormants, windowDays: 90 };
  }

  /** 缺貨警示（onHandQty < min_qty by part_stock_setting）。 */
  async lowStockAlert(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const settings = await this.prisma.nx03PartStockSetting.findMany({
      where: { tenantId, minQty: { gt: 0 } },
      take: 200,
      select: { partId: true, warehouseId: true, minQty: true },
    });
    const lowStock: Array<{ partId: string; warehouseId: string; minQty: unknown; onHandQty: unknown }> = [];
    for (const s of settings) {
      const bal = await this.prisma.nx03StockBalance.findFirst({
        where: { tenantId, partId: s.partId, warehouseId: s.warehouseId },
        select: { onHandQty: true },
      });
      if (bal && Number(bal.onHandQty) < Number(s.minQty)) {
        lowStock.push({ partId: s.partId, warehouseId: s.warehouseId, minQty: s.minQty, onHandQty: bal.onHandQty });
      }
    }
    return { ok: true, lowStockCount: lowStock.length, items: lowStock.slice(0, 20) };
  }
}
