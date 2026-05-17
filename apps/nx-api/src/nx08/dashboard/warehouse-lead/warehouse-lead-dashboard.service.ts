// apps/nx-api/src/nx08/dashboard/warehouse-lead/warehouse-lead-dashboard.service.ts
// NX08 倉管組長 dashboard service（即時 SQL 聚合）
//
// 對齊：overview v0.1.0 §3.1 倉管組長 #7~#9 + §3.2 改革 2（DnHandover 動態交接統計 ⭐⭐⭐）
// 3 method：deliveryCost（配送成本）/ routeEfficiency（路線效率）/ handoverStats（動態交接 ⭐⭐⭐）

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireTenantId } from '../../../shared/nx01/require-tenant';

@Injectable()
export class Nx08WarehouseLeadDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** 配送成本分析（item internalCost 加總 + Lalamove vs 自家 by callbackStatus）。 */
  async deliveryCost(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const costAgg = await this.prisma.nx06DnItem.aggregate({
      where: {
        dn: { tenantId, completedAt: { gte: monthStart } },
        internalCost: { not: null },
      },
      _sum: { internalCost: true },
      _count: { _all: true },
    });

    const byLogisticsType = await this.prisma.nx06Dn.groupBy({
      by: ['logisticsType'],
      where: { tenantId, completedAt: { gte: monthStart } },
      _count: { _all: true },
    });

    const lalamoveDns = await this.prisma.nx06Dn.count({
      where: { tenantId, lalamoveOrderId: { not: null }, completedAt: { gte: monthStart } },
    });

    return {
      ok: true,
      period: monthStart.toISOString().slice(0, 7),
      totalInternalCost: costAgg._sum.internalCost ?? 0,
      itemCount: costAgg._count._all,
      byLogisticsType,
      lalamoveDnCount: lalamoveDns,
    };
  }

  /** 路線效率（estimated_duration_sec + completed 簽收率）。 */
  async routeEfficiency(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const durationAgg = await this.prisma.nx06Dn.aggregate({
      where: { tenantId, completedAt: { gte: monthStart }, estimatedDurationSec: { not: null } },
      _sum: { estimatedDurationSec: true },
      _avg: { estimatedDurationSec: true },
      _count: { _all: true },
    });

    const completedCount = await this.prisma.nx06Dn.count({
      where: { tenantId, status: { in: ['DELIVERED', 'COMPLETED', 'PICKED_UP'] }, completedAt: { gte: monthStart } },
    });
    const totalDispatched = await this.prisma.nx06Dn.count({
      where: { tenantId, completedAt: { gte: monthStart } },
    });

    return {
      ok: true,
      period: monthStart.toISOString().slice(0, 7),
      totalEstimatedDurationSec: durationAgg._sum.estimatedDurationSec ?? 0,
      avgEstimatedDurationSec: durationAgg._avg.estimatedDurationSec ?? 0,
      completedRate: totalDispatched > 0 ? Math.round((completedCount / totalDispatched) * 100) : 0,
      completedCount,
      totalDispatched,
    };
  }

  /**
   * ⭐⭐⭐ 動態任務轉派統計（業界改革候選 #2、接合 NX06-IMPL-02 closure）。
   * 業界第一個動態交接統計 dashboard。
   */
  async handoverStats(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const byStatus = await this.prisma.nx06DnHandover.groupBy({
      by: ['status'],
      where: { tenantId, suggestedAt: { gte: monthStart } },
      _count: { _all: true },
    });

    const topDrivers = await this.prisma.nx06DnHandover.groupBy({
      by: ['toDriverId'],
      where: { tenantId, status: 'COMPLETED', suggestedAt: { gte: monthStart } },
      _count: { _all: true },
      orderBy: { _count: { toDriverId: 'desc' } },
      take: 5,
    });

    const totalSuggested = byStatus.find((b) => b.status === 'SUGGESTED')?._count._all ?? 0;
    const totalAccepted = byStatus.find((b) => b.status === 'ACCEPTED')?._count._all ?? 0;
    const totalCompleted = byStatus.find((b) => b.status === 'COMPLETED')?._count._all ?? 0;
    const totalAll = byStatus.reduce((s, b) => s + b._count._all, 0);

    return {
      ok: true,
      reform: '業界改革 #2 動態任務轉派統計（NX06-IMPL-02 接合）',
      period: monthStart.toISOString().slice(0, 7),
      byStatus,
      acceptanceRate: totalAll > 0 ? Math.round(((totalAccepted + totalCompleted) / totalAll) * 100) : 0,
      completionRate: totalSuggested > 0 ? Math.round((totalCompleted / totalSuggested) * 100) : 0,
      topReceiverDrivers: topDrivers,
    };
  }
}
