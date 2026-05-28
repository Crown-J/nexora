// apps/nx-api/src/nx08/dashboard/sales-rep/sales-rep-dashboard.service.ts
// NX08 業務員 dashboard service（即時 SQL 聚合、Q1=c 不依賴 Cache）
//
// 對齊：
//   - overview v0.1.0 §3.1 業務員 dashboard #1~#3
//   - audit-01 §6.2 角色 dashboard 候選
//
// 3 method：
//   - personalSales：個人銷售業績（月度銷售額 + 目標達成率）
//   - customerInsight：客戶分析（VIP / 流失 / 客單價）
//   - productSales：商品銷量排行（熱銷 + 滯銷 + 利潤率）

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireTenantId } from '../../../shared/nx01/require-tenant';

@Injectable()
export class Nx08SalesRepDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** 個人銷售業績（當月 SO 聚合）。 */
  async personalSales(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const agg = await this.prisma.nx04So.aggregate({
      where: { tenantId, createdBy: user.sub, soDate: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });

    const targets = await this.prisma.nx01KpiTarget.findMany({
      where: { tenantId, userId: user.sub },
      take: 5,
      select: {
        id: true,
        targetValue: true,
        periodYear: true,
        periodValue: true,
        kpiTemplate: { select: { name: true, code: true, unit: true } },
      },
    });

    return {
      ok: true,
      period: monthStart.toISOString().slice(0, 7),
      totalSoCount: agg._count._all,
      totalSoAmount: agg._sum.totalAmount ?? 0,
      kpiTargets: targets,
    };
  }

  /** 客戶分析：top 客戶 + 流失候選（90 天無下單）。 */
  async customerInsight(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400 * 1000);

    const topCustomers = await this.prisma.nx04So.groupBy({
      by: ['customerId'],
      where: { tenantId, createdBy: user.sub, soDate: { gte: ninetyDaysAgo } },
      _sum: { totalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    });

    // 流失候選：曾下單但 90 天無動靜（業務員儀表板看「客戶 + 同行」、partner 改制六分類後 B=銀行 不該在此 — Alex 判定原 ['C', 'B'] 為筆誤）
    const inactiveCount = await this.prisma.nx01Partner.count({
      where: {
        tenantId,
        salesUserId: user.sub,
        partnerType: { in: ['C', 'O'] },
        rev_Nx04So_customerId: { none: { soDate: { gte: ninetyDaysAgo } } },
      },
    });

    return {
      ok: true,
      topCustomers,
      inactiveCustomerCount: inactiveCount,
      windowDays: 90,
    };
  }

  /** 商品銷量排行（熱銷 + 滯銷）。 */
  async productSales(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const items = await this.prisma.nx04SoItem.findMany({
      where: { so: { tenantId, createdBy: user.sub, soDate: { gte: monthStart } } },
      select: { partId: true, partNo: true, partName: true, qty: true, lineAmount: true },
    });
    const grouped = new Map<string, { partNo: string; partName: string; qtySum: number; amtSum: number }>();
    for (const it of items) {
      const key = it.partId ?? `__partno__${it.partNo}`;
      const existing = grouped.get(key) ?? { partNo: it.partNo ?? '', partName: it.partName ?? '', qtySum: 0, amtSum: 0 };
      existing.qtySum += Number(it.qty);
      existing.amtSum += Number(it.lineAmount);
      grouped.set(key, existing);
    }
    const top = Array.from(grouped.entries())
      .map(([partId, v]) => ({ partId, ...v }))
      .sort((a, b) => b.amtSum - a.amtSum)
      .slice(0, 10);

    return {
      ok: true,
      period: monthStart.toISOString().slice(0, 7),
      topProducts: top,
    };
  }
}
