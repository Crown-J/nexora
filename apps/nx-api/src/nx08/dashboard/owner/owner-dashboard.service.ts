// apps/nx-api/src/nx08/dashboard/owner/owner-dashboard.service.ts
// NX08 主管 dashboard service（即時 SQL 聚合）
//
// 對齊：overview v0.1.0 §3.1 主管 #16~#18
// 3 method：deptPerf / salesRanking / kpiGap

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireTenantId } from '../../../shared/nx01/require-tenant';

@Injectable()
export class Nx08OwnerDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** 部門業績（依 user role 聚合 SO 數）。 */
  async deptPerf(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const soByUser = await this.prisma.nx04So.groupBy({
      by: ['createdBy'],
      where: { tenantId, soDate: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 20,
    });
    return { ok: true, period: monthStart.toISOString().slice(0, 7), byUser: soByUser };
  }

  /** 業務員 ranking + 達成率（quoted vs target）。 */
  async salesRanking(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const ranking = await this.prisma.nx04So.groupBy({
      by: ['createdBy'],
      where: { tenantId, status: { not: 'CANCELLED' }, soDate: { gte: monthStart } },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    });
    return { ok: true, period: monthStart.toISOString().slice(0, 7), ranking };
  }

  /** KPI gap（user-level target vs record）。 */
  async kpiGap(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const year = new Date().getFullYear();
    const targets = await this.prisma.nx01KpiTarget.findMany({
      where: { tenantId, periodYear: year, targetType: 'U' },
      take: 20,
      select: {
        userId: true,
        targetValue: true,
        periodYear: true,
        periodValue: true,
        kpiTemplate: { select: { name: true, code: true } },
      },
    });
    return { ok: true, year, userTargets: targets };
  }
}
