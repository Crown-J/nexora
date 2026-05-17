// apps/nx-api/src/nx04/sales-performance/sales-performance.service.ts
// NX04 SalesPerformance service（LITE/PLUS 業績追蹤）
//
// 對齊：
//   - overview §5 銷售業績追蹤（Crown Q8 Tier 差異化）
//   - overview §5.1 LITE/PLUS 範圍：顯示毛利 + 用戶手動目標 + 月度匯總
//   - overview §5.2 PRO 範圍（KPI 完整系統）留範圍 B 戰略軌
//
// 業務語意：
//   - 純 query 計算、不寫 DB、不存目標（目標 UI 自填 / localStorage / 後續 PRO 新表）
//   - 毛利計算：SUM(SoItem.lineAmount) - SUM(ledger.unitCost × qty when source='S' AND sourceDocId=so.id)
//   - 月度 / 年度匯總、target 純對比
//
// 範式：
//   - 對齊 NX02 PriceComparisonService 純 read-only 聚合查詢範式
//   - 不寫 schema、不寫 ledger
//   - LITE/PLUS 簡單版（PRO 完整 KPI 留範圍 B）

import { Injectable } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { SalesPerformanceQueryDto } from './dto/sales-performance.dto';

@Injectable()
export class SalesPerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: RequestUser, q: SalesPerformanceQueryDto) {
    const tenantId = requireTenantId(user);
    const userId = q.userId?.trim() || user.sub;

    // period 範圍：month 指定→單月、無→整年
    const startDate = q.month
      ? new Date(q.year, q.month - 1, 1)
      : new Date(q.year, 0, 1);
    const endDate = q.month
      ? new Date(q.year, q.month, 1)
      : new Date(q.year + 1, 0, 1);

    // ============================================================
    // 業績總額：SUM(SO.totalAmount) WHERE soDate in period AND createdBy=userId
    // 排除 CANCELLED + voided
    // ============================================================
    const soAgg = await this.prisma.nx04So.aggregate({
      where: {
        tenantId,
        createdBy: userId,
        soDate: { gte: startDate, lt: endDate },
        status: { notIn: ['CANCELLED'] },
      },
      _sum: { totalAmount: true, subtotal: true },
      _count: { id: true },
    });
    const totalSale = new PrismaNs.Decimal(soAgg._sum.subtotal ?? 0); // 用 subtotal（未稅）算毛利
    const totalSaleWithTax = new PrismaNs.Decimal(soAgg._sum.totalAmount ?? 0);
    const soCount = soAgg._count.id;

    // ============================================================
    // 毛利計算：SUM(ledger.unitCost × qty) WHERE sourceModule='NX04' source='S' AND so.createdBy=userId
    // 對齊既有 ledger 寫入：so.service applyQtyOutWithLedger source='S' sourceDocId=so.id
    // ============================================================
    // ledger 用 String sourceDocId（寬鬆 FK 設計、無 relation）、先 query 全 NX04 source=S 再 application 層 filter own SO
    const ledgerRows = await this.prisma.nx03StockLedger.findMany({
      where: {
        tenantId,
        sourceModule: 'NX04',
        sourceDocType: 'S',
        movementDate: { gte: startDate, lt: endDate },
      },
      select: {
        sourceDocId: true,
        qtyOut: true,
        unitCost: true,
      },
    });

    // 反查 SO createdBy（避免 ledger schema 無 createdBy 欄）
    const soIds = Array.from(new Set(ledgerRows.map((r) => r.sourceDocId)));
    const sos = await this.prisma.nx04So.findMany({
      where: { id: { in: soIds }, tenantId, createdBy: userId },
      select: { id: true },
    });
    const ownSoIds = new Set(sos.map((s) => s.id));

    let totalCost = new PrismaNs.Decimal(0);
    for (const r of ledgerRows) {
      if (!ownSoIds.has(r.sourceDocId)) continue;
      totalCost = totalCost.add(new PrismaNs.Decimal(r.qtyOut).mul(new PrismaNs.Decimal(r.unitCost ?? 0)));
    }

    const grossProfit = totalSale.sub(totalCost);
    const grossMarginPct = totalSale.gt(0)
      ? grossProfit.div(totalSale).mul(100).toDecimalPlaces(2)
      : new PrismaNs.Decimal(0);

    // ============================================================
    // target 對比（純計算、不存）
    // ============================================================
    const target = q.target !== undefined ? new PrismaNs.Decimal(q.target) : null;
    const targetAchievedPct = target && target.gt(0)
      ? totalSaleWithTax.div(target).mul(100).toDecimalPlaces(2)
      : null;

    return {
      userId,
      period: {
        year: q.year,
        month: q.month ?? null,
        startDate,
        endDate,
      },
      sales: {
        totalSale: totalSale.toString(), // 未稅
        totalSaleWithTax: totalSaleWithTax.toString(),
        totalCost: totalCost.toString(),
        grossProfit: grossProfit.toString(),
        grossMarginPct: grossMarginPct.toString(),
        soCount,
      },
      target: target
        ? {
            target: target.toString(),
            achieved: totalSaleWithTax.toString(),
            achievedPct: targetAchievedPct?.toString() ?? null,
            isAchieved: targetAchievedPct ? targetAchievedPct.gte(100) : false,
          }
        : null,
      tier: 'LITE/PLUS', // PRO 完整 KPI 留範圍 B 戰略軌
    };
  }
}
