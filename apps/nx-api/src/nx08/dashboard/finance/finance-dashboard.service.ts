// apps/nx-api/src/nx08/dashboard/finance/finance-dashboard.service.ts
// NX08 財務 dashboard service（即時 SQL 聚合）
//
// 對齊：overview v0.1.0 §3.1 財務 #13~#15
// 3 method：arOverview / apOverview / cashFlow

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireTenantId } from '../../../shared/nx01/require-tenant';

@Injectable()
export class Nx08FinanceDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** AR 總覽（總額 + 未付 + 逾期 by status）。 */
  async arOverview(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const byStatus = await this.prisma.nx05ArLedger.groupBy({
      by: ['status'],
      where: { tenantId },
      _sum: { balanceAmount: true, originalAmount: true },
      _count: { _all: true },
    });
    const overdue = await this.prisma.nx05ArLedger.count({
      where: { tenantId, balanceAmount: { gt: 0 }, dueDate: { lt: new Date() } },
    });
    return { ok: true, byStatus, overdueCount: overdue };
  }

  /** AP 總覽（即將到期 30 天內 + 未付）。 */
  async apOverview(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const thirtyDaysAhead = new Date(Date.now() + 30 * 86400 * 1000);
    const byStatus = await this.prisma.nx05ApLedger.groupBy({
      by: ['status'],
      where: { tenantId },
      _sum: { balanceAmount: true, originalAmount: true },
      _count: { _all: true },
    });
    const dueSoon = await this.prisma.nx05ApLedger.count({
      where: { tenantId, balanceAmount: { gt: 0 }, dueDate: { lte: thirtyDaysAhead, gte: new Date() } },
    });
    return { ok: true, byStatus, dueSoon30dCount: dueSoon };
  }

  /** 現金流預測（30/60/90 天 by dueDate）。 */
  async cashFlow(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const now = new Date();
    const buckets = [30, 60, 90];
    const out: Array<{ windowDays: number; arInflow: unknown; apOutflow: unknown }> = [];
    for (const days of buckets) {
      const end = new Date(now.getTime() + days * 86400 * 1000);
      const arIn = await this.prisma.nx05ArLedger.aggregate({
        where: { tenantId, balanceAmount: { gt: 0 }, dueDate: { gte: now, lte: end } },
        _sum: { balanceAmount: true },
      });
      const apOut = await this.prisma.nx05ApLedger.aggregate({
        where: { tenantId, balanceAmount: { gt: 0 }, dueDate: { gte: now, lte: end } },
        _sum: { balanceAmount: true },
      });
      out.push({
        windowDays: days,
        arInflow: arIn._sum.balanceAmount ?? 0,
        apOutflow: apOut._sum.balanceAmount ?? 0,
      });
    }
    return { ok: true, buckets: out };
  }
}
