// apps/nx-api/src/nx08/dashboard/finance/finance-dashboard.service.ts
// NX08 財務 dashboard service（即時 SQL 聚合）
//
// 對齊：overview v0.1.0 §3.1 財務 #13~#15
// 4 method：arOverview / apOverview / cashFlow + pnl（v1.2 階段 H P1 新加）

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

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

  // ────────────────────────────────────────────────────────────
  // v1.2 階段 H P1：損益表（PnL、簡化版「進銷淨額法」）
  //
  // 對齊意圖書 §2.5 + 總經理 2026-06-01 拍板「本軌只做損益表」+ Alex Q2=a。
  //
  // 公式：
  //   收入（銷貨淨額）= SUM(SO.totalAmount in period) − SUM(SR.totalAmount in period)
  //   成本（銷貨成本、進銷法）= SUM(RR.totalAmount POSTED in period) − SUM(PR.totalAmount POSTED in period)
  //   毛利 = 收入 − 成本
  //   營業費用 = SUM(Paylog WHERE payType='EX' AND accountCode.category='E' AND payDate in period)
  //   營業淨利 = 毛利 − 營業費用
  //
  // ⚠️ 簡化版說明：
  //   - 「真正」會計上的銷貨成本 = 賣出商品的成本（依出庫成本算），需 lineItem 級別 cost
  //   - LITE 階段用「進銷法」簡化（許多小公司也這麼算）、後續軌可升級為移動平均成本拆算
  //   - 完整損益表（含營業外損益/所得稅）列後續軌
  // ────────────────────────────────────────────────────────────

  async pnl(
    user: RequestUser,
    q: { periodStart: string; periodEnd: string },
  ) {
    const tenantId = requireTenantId(user);
    if (!q.periodStart || !q.periodEnd) {
      throw new BadRequestException('periodStart 與 periodEnd 必填（YYYY-MM-DD）');
    }
    const start = new Date(q.periodStart);
    const end = new Date(q.periodEnd);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      throw new BadRequestException('periodStart / periodEnd 必須是有效日期');
    }
    end.setHours(23, 59, 59, 999);

    const [so, sr, rr, pr, expensesByCode, expenseRows] = await Promise.all([
      this.prisma.nx04So.aggregate({
        where: { tenantId, soDate: { gte: start, lte: end }, cancelledAt: null },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.nx04Sr.aggregate({
        where: { tenantId, srDate: { gte: start, lte: end } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.nx02Rr.aggregate({
        where: { tenantId, rrDate: { gte: start, lte: end }, status: 'POSTED' },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.nx02Pr.aggregate({
        where: { tenantId, prDate: { gte: start, lte: end }, status: 'POSTED' },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      // 營業費用分科目（依 accountCode.category='E'、含 5100 銷貨成本但本表分開算進銷淨額、所以排除 5100）
      this.prisma.nx05Paylog.groupBy({
        by: ['accountCodeId'],
        where: {
          tenantId,
          payType: 'EX',
          status: 'POSTED',
          payDate: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      // 取得科目名稱（為了顯示明細）
      this.prisma.nx05AccountCode.findMany({
        where: { tenantId, category: 'E' },
        select: { id: true, code: true, name: true },
      }),
    ]);

    const acMap = new Map(expenseRows.map((r) => [r.id, r] as const));
    // 排除 5100 銷貨成本科目（進銷法已涵蓋、避免重複計）
    const expenseDetail = expensesByCode
      .filter((g) => g.accountCodeId)
      .map((g) => {
        const code = acMap.get(g.accountCodeId!);
        return {
          accountCode: code?.code ?? '—',
          accountName: code?.name ?? '—',
          amount: g._sum.amount?.toString() ?? '0',
        };
      })
      .filter((d) => d.accountCode !== '5100'); // 5100 銷貨成本不重複計

    const sumSO = new PrismaNs.Decimal(so._sum.totalAmount ?? 0);
    const sumSR = new PrismaNs.Decimal(sr._sum.totalAmount ?? 0);
    const sumRR = new PrismaNs.Decimal(rr._sum.totalAmount ?? 0);
    const sumPR = new PrismaNs.Decimal(pr._sum.totalAmount ?? 0);

    const revenue = sumSO.minus(sumSR);
    const cogs = sumRR.minus(sumPR);
    const grossProfit = revenue.minus(cogs);

    const opex = expenseDetail.reduce(
      (acc, d) => acc.plus(new PrismaNs.Decimal(d.amount)),
      new PrismaNs.Decimal(0),
    );
    const operatingIncome = grossProfit.minus(opex);
    const grossMarginPct = revenue.gt(0) ? grossProfit.div(revenue).mul(100) : new PrismaNs.Decimal(0);
    const opMarginPct = revenue.gt(0) ? operatingIncome.div(revenue).mul(100) : new PrismaNs.Decimal(0);

    return {
      periodStart: q.periodStart,
      periodEnd: q.periodEnd,
      revenue: {
        gross: sumSO.toString(),
        return: sumSR.toString(),
        net: revenue.toString(),
        soCount: so._count._all,
        srCount: sr._count._all,
      },
      cogs: {
        gross: sumRR.toString(),
        return: sumPR.toString(),
        net: cogs.toString(),
        rrCount: rr._count._all,
        prCount: pr._count._all,
      },
      grossProfit: grossProfit.toString(),
      grossMarginPct: grossMarginPct.toFixed(2),
      opex: {
        total: opex.toString(),
        detail: expenseDetail,
      },
      operatingIncome: operatingIncome.toString(),
      opMarginPct: opMarginPct.toFixed(2),
      note: '進銷淨額法（簡化版）：成本=進貨淨額；完整 lineItem 移動平均成本算法列後續軌',
    };
  }
}
