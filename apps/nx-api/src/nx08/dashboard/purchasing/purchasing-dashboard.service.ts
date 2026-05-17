// apps/nx-api/src/nx08/dashboard/purchasing/purchasing-dashboard.service.ts
// NX08 採購 dashboard service（即時 SQL 聚合）
//
// 對齊：
//   - overview v0.1.0 §3.1 採購 #10~#12
//   - overview §3.2 改革 1：AR 補貨建議命中率 ⭐⭐⭐（接合 AR closure）
//   - 4 method（業界改革內嵌、Hank Q-H5 拍板）：supplierGrade / priceCompare / poStats / arRecallHitRate ⭐⭐⭐

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireTenantId } from '../../../shared/nx01/require-tenant';

@Injectable()
export class Nx08PurchasingDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** 廠商評等（top 10 by PO 累計金額）。 */
  async supplierGrade(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date(Date.now() - 90 * 86400 * 1000);
    const top = await this.prisma.nx02Po.groupBy({
      by: ['supplierId'],
      where: { tenantId, poDate: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    });
    return { ok: true, period: '90d', topSuppliers: top };
  }

  /** 比價歷史（同 part 跨多供應商最近 90 天 PO 單價）。 */
  async priceCompare(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400 * 1000);
    const sample = await this.prisma.nx02PoItem.findMany({
      where: { po: { tenantId, poDate: { gte: ninetyDaysAgo } } },
      take: 200,
      select: {
        partId: true,
        partNo: true,
        unitCost: true,
        po: { select: { supplierId: true, poDate: true } },
      },
      orderBy: { id: 'desc' },
    });
    return { ok: true, sampleSize: sample.length, items: sample.slice(0, 50) };
  }

  /** 採購額月度統計。 */
  async poStats(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthAgg = await this.prisma.nx02Po.aggregate({
      where: { tenantId, poDate: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });
    return {
      ok: true,
      period: monthStart.toISOString().slice(0, 7),
      poCount: monthAgg._count._all,
      poAmount: monthAgg._sum.totalAmount ?? 0,
    };
  }

  /**
   * ⭐⭐⭐ AR 補貨建議命中率（業界改革 #1、接合 AR closure）。
   * 命中率定義 = Nx02Demand（demandType=S 缺貨建議）已關聯 refRfqId / 全部 Demand 數。
   */
  async arRecallHitRate(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date(Date.now() - 90 * 86400 * 1000);
    const totalSuggested = await this.prisma.nx02Demand.count({
      where: { tenantId, demandType: 'S', createdAt: { gte: monthStart } },
    });
    const hitByRfq = await this.prisma.nx02Demand.count({
      where: { tenantId, demandType: 'S', createdAt: { gte: monthStart }, refRfqId: { not: null } },
    });
    const hitRate = totalSuggested > 0 ? Math.round((hitByRfq / totalSuggested) * 100) : 0;

    return {
      ok: true,
      reform: '業界改革 #1 AR 補貨建議命中率（接合 AR-IMPL-01 closure）',
      period: '90d',
      totalSuggestionCount: totalSuggested,
      hitByRfqCount: hitByRfq,
      hitRatePercent: hitRate,
      note: 'hitRate = (Nx02Demand[demandType=S].refRfqId IS NOT NULL) / total Demand',
    };
  }
}
