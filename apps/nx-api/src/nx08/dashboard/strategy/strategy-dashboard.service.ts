// apps/nx-api/src/nx08/dashboard/strategy/strategy-dashboard.service.ts
// NX08 Crown 戰略 dashboard service（即時 SQL 聚合 / 跨模組綜合）
//
// 對齊：
//   - overview v0.1.0 §3.1 Crown 戰略 #19~#21
//   - overview §3.2 改革 3：BCG matrix + HPA trend ⭐⭐⭐
//   - 3 method：crossModule / bcgMatrix ⭐⭐⭐ / strategyKpi

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireTenantId } from '../../../shared/nx01/require-tenant';

@Injectable()
export class Nx08StrategyDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** 跨部門綜合（採購 + 銷貨 + 庫存 + 應收 完整鏈快照）。 */
  async crossModule(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [poAgg, soAgg, arAgg, apAgg, dnCount, handoverCount, demandCount] = await Promise.all([
      this.prisma.nx02Po.aggregate({
        where: { tenantId, poDate: { gte: monthStart } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.nx04So.aggregate({
        where: { tenantId, soDate: { gte: monthStart } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.nx05ArLedger.aggregate({
        where: { tenantId },
        _sum: { balanceAmount: true },
      }),
      this.prisma.nx05ApLedger.aggregate({
        where: { tenantId },
        _sum: { balanceAmount: true },
      }),
      this.prisma.nx06Dn.count({ where: { tenantId, completedAt: { gte: monthStart } } }),
      this.prisma.nx06DnHandover.count({ where: { tenantId, suggestedAt: { gte: monthStart } } }),
      this.prisma.nx02Demand.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
    ]);

    return {
      ok: true,
      period: monthStart.toISOString().slice(0, 7),
      purchase: { poCount: poAgg._count._all, poAmount: poAgg._sum.totalAmount ?? 0 },
      sales: { soCount: soAgg._count._all, soAmount: soAgg._sum.totalAmount ?? 0 },
      finance: { arBalance: arAgg._sum.balanceAmount ?? 0, apBalance: apAgg._sum.balanceAmount ?? 0 },
      logistics: { dnCompleted: dnCount, handoverEvents: handoverCount },
      autoReplenish: { suggestionsRaised: demandCount },
    };
  }

  /**
   * ⭐⭐⭐ BCG matrix 商品分類（業界改革 #3、4 象限自動標記）。
   * - 軸 X = 銷售量增長（近 30 天 vs 前 30 天）
   * - 軸 Y = 期間銷售額相對市占（top quartile vs rest）
   * - 4 象限：S 明星 / C 金牛 / Q 問題 / D 老狗
   * - 規模簡化版（top 50 by 銷售額）
   */
  async bcgMatrix(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const now = Date.now();
    const last30Start = new Date(now - 30 * 86400 * 1000);
    const prev30Start = new Date(now - 60 * 86400 * 1000);

    const items = await this.prisma.nx04SoItem.findMany({
      where: { so: { tenantId, soDate: { gte: prev30Start } } },
      take: 5000,
      select: {
        partId: true,
        partNo: true,
        partName: true,
        qty: true,
        lineAmount: true,
        so: { select: { soDate: true } },
      },
    });
    const map = new Map<string, { partNo: string; partName: string; recent: number; prior: number; revenue: number }>();
    for (const it of items) {
      const key = it.partId ?? `__partno__${it.partNo}`;
      const recent = it.so.soDate >= last30Start;
      const e = map.get(key) ?? { partNo: it.partNo ?? '', partName: it.partName ?? '', recent: 0, prior: 0, revenue: 0 };
      const q = Number(it.qty);
      if (recent) e.recent += q;
      else e.prior += q;
      e.revenue += Number(it.lineAmount);
      map.set(key, e);
    }
    const rows = Array.from(map.entries()).map(([partId, v]) => {
      const growth = v.prior > 0 ? (v.recent - v.prior) / v.prior : v.recent > 0 ? 1 : 0;
      return { partId, partNo: v.partNo, partName: v.partName, recent30: v.recent, prior30: v.prior, growth, revenue: v.revenue };
    });
    rows.sort((a, b) => b.revenue - a.revenue);
    const topQuartileRevenue = rows[Math.floor(rows.length / 4)]?.revenue ?? 0;
    const labeled = rows.slice(0, 50).map((r) => {
      const highShare = r.revenue >= topQuartileRevenue;
      const highGrowth = r.growth > 0;
      let quadrant: 'S' | 'C' | 'Q' | 'D';
      if (highShare && highGrowth) quadrant = 'S'; // Star
      else if (highShare && !highGrowth) quadrant = 'C'; // Cow
      else if (!highShare && highGrowth) quadrant = 'Q'; // Question
      else quadrant = 'D'; // Dog
      return { ...r, quadrant };
    });
    return {
      ok: true,
      reform: '業界改革 #3 BCG matrix 商品分類（自動標記）',
      period: '60d split (recent30 vs prior30)',
      topQuartileRevenueThreshold: topQuartileRevenue,
      items: labeled,
    };
  }

  /** 戰略 KPI（業界改革 3 指標複合：AR 命中率 + handover 完成率 + BCG 健康度 stub）。 */
  async strategyKpi(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date(Date.now() - 30 * 86400 * 1000);

    const [demandTotal, demandHit, handoverTotal, handoverDone] = await Promise.all([
      this.prisma.nx02Demand.count({ where: { tenantId, demandType: 'S', createdAt: { gte: monthStart } } }),
      this.prisma.nx02Demand.count({ where: { tenantId, demandType: 'S', createdAt: { gte: monthStart }, refRfqId: { not: null } } }),
      this.prisma.nx06DnHandover.count({ where: { tenantId, suggestedAt: { gte: monthStart } } }),
      this.prisma.nx06DnHandover.count({ where: { tenantId, suggestedAt: { gte: monthStart }, status: 'COMPLETED' } }),
    ]);

    return {
      ok: true,
      period: '30d',
      arHitRatePercent: demandTotal > 0 ? Math.round((demandHit / demandTotal) * 100) : 0,
      handoverCompleteRatePercent: handoverTotal > 0 ? Math.round((handoverDone / handoverTotal) * 100) : 0,
      bcgHealthScore: 'see /strategy/bcg-matrix endpoint for full breakdown',
      reformIndicators: '業界改革 3 指標複合（AR / Handover / BCG）',
    };
  }
}
