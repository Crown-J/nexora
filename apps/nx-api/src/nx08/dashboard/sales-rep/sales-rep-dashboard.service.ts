// apps/nx-api/src/nx08/dashboard/sales-rep/sales-rep-dashboard.service.ts
// NX08 業務員 dashboard service（即時 SQL 聚合、Q1=c 不依賴 Cache）
//
// 對齊：
//   - overview v0.1.0 §3.1 業務員 dashboard #1~#3
//   - audit-01 §6.2 角色 dashboard 候選
//
// 4 method：
//   - personalSales：個人銷售業績（月度銷售額 + 目標達成率）
//   - customerInsight：客戶分析（VIP / 流失 / 客單價）
//   - productSales：商品銷量排行（熱銷 + 滯銷 + 利潤率）
//   - personalMonthlyReport：個人月報（v1.2 階段 H P3a、Alex Q5=b 直接 SUM）

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

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

  // ────────────────────────────────────────────────────────────
  // v1.2 階段 H P3a：個人月報（Alex Q5=b 後端直接 SUM、不動 KPI 系統）
  //
  // 對齊意圖書 §2.1：
  //   - 業績（總經理拍板）= 銷貨額 + 毛利（兩者都顯示）
  //   - 開單數（報價 / 銷貨 / 進貨各幾張）
  //   - 出貨件數 + 撿貨件數
  //   - 跑客戶家數
  //   - 員工選擇：負責人可選其他人（service 不過濾權限、controller 層套）
  //
  // 算法：
  //   - 銷貨額 = SUM(SO.totalAmount where createdBy=userId)
  //   - 毛利 = SUM(SO.totalAmount) − SUM(對應 SO 中 partId 的 part.cost × SoItem.qty)
  //     ⚠️ 簡化：用 part.cost 而非 lineItem cost 快照
  //   - 開單：SO/QT/PO COUNT by createdBy
  //   - 撿貨件數 = SUM(Pk.items.qty where Pk.createdBy=userId)
  //   - 出貨件數 = SUM(Dn.items.qty where Dn.driverUserId=userId)
  //   - 跑客戶 = COUNT DISTINCT(DnStop.partnerId where Dn.driverUserId=userId)
  // ────────────────────────────────────────────────────────────

  async personalMonthlyReport(
    user: RequestUser,
    q: { periodStart: string; periodEnd: string; userId?: string },
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
    const targetUserId = q.userId?.trim() || user.sub;

    const [so, qt, po, soItems, pkItems, dnItems, dnStops] = await Promise.all([
      // 銷貨單彙總（業績主源）
      this.prisma.nx04So.aggregate({
        where: {
          tenantId,
          createdBy: targetUserId,
          soDate: { gte: start, lte: end },
          cancelledAt: null,
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      // 報價單開單數
      this.prisma.nx02Qt.count({
        where: { tenantId, createdBy: targetUserId, createdAt: { gte: start, lte: end } },
      }),
      // 採購單開單數
      this.prisma.nx02Po.count({
        where: { tenantId, createdBy: targetUserId, poDate: { gte: start, lte: end } },
      }),
      // 毛利計算用：拿該人 SO items + part.cost
      this.prisma.nx04SoItem.findMany({
        where: {
          so: { tenantId, createdBy: targetUserId, soDate: { gte: start, lte: end }, cancelledAt: null },
        },
        select: {
          qty: true,
          lineAmount: true,
          part: { select: { cost: true } },
        },
      }),
      // 撿貨件數（Pk）
      this.prisma.nx03PkItem.findMany({
        where: { pk: { tenantId, createdBy: targetUserId, createdAt: { gte: start, lte: end } } },
        select: { qty: true },
      }),
      // 出貨件數（Dn driverUserId）
      this.prisma.nx06DnItem.findMany({
        where: { dn: { tenantId, driverUserId: targetUserId, dnDate: { gte: start, lte: end } } },
        select: { qty: true },
      }),
      // 跑客戶家數（Dn stop 唯一 partnerId）
      this.prisma.nx06DnStop.findMany({
        where: {
          dn: { tenantId, driverUserId: targetUserId, dnDate: { gte: start, lte: end } },
        },
        select: { partnerId: true },
        distinct: ['partnerId'],
      }),
    ]);

    // 毛利 = SUM(lineAmount) − SUM(part.cost × qty)
    const salesAmount = new PrismaNs.Decimal(so._sum.totalAmount ?? 0);
    let cogsAmount = new PrismaNs.Decimal(0);
    for (const it of soItems) {
      const cost = new PrismaNs.Decimal(it.part?.cost ?? 0);
      const q = new PrismaNs.Decimal(it.qty);
      cogsAmount = cogsAmount.plus(cost.mul(q));
    }
    const grossProfit = salesAmount.minus(cogsAmount);
    const grossMarginPct = salesAmount.gt(0)
      ? grossProfit.div(salesAmount).mul(100).toFixed(2)
      : '0.00';

    const pickQty = pkItems.reduce(
      (acc, it) => acc.plus(new PrismaNs.Decimal(it.qty)),
      new PrismaNs.Decimal(0),
    );
    const shipQty = dnItems.reduce(
      (acc, it) => acc.plus(new PrismaNs.Decimal(it.qty)),
      new PrismaNs.Decimal(0),
    );
    const customerCount = dnStops.filter((s) => s.partnerId).length;

    return {
      periodStart: q.periodStart,
      periodEnd: q.periodEnd,
      userId: targetUserId,
      isSelf: targetUserId === user.sub,
      orderCounts: {
        so: so._count._all,
        qt,
        po,
      },
      performance: {
        salesAmount: salesAmount.toString(),
        cogsAmount: cogsAmount.toString(),
        grossProfit: grossProfit.toString(),
        grossMarginPct,
      },
      operations: {
        pickQty: pickQty.toString(),
        shipQty: shipQty.toString(),
        customerCount,
      },
      note: '毛利用 part.cost × qty 簡化算（無 lineItem cost 快照、實際應改 moving avg）',
    };
  }
}
