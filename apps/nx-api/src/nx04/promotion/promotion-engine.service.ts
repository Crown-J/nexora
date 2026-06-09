// apps/nx-api/src/nx04/promotion/promotion-engine.service.ts
// F1-E 銷貨優惠價引擎 2026-06-09：resolvePromotionPrice 取最低 + 即期自動 + 警示
//
// 業務語意（Alex 拍板）：
//   ① 取最低 = min(客戶正常價〔分級 priceA~D + customMarginPct〕, 所有適用促銷/即期/出清價)
//      ⭐ 客戶分級價務必納入比較（不只促銷規則之間比、VIP 保有低價）
//   ② 即期自動：批號 warrantyExpiredAt 距今 < tenant.shelfLifeWarningDays → 套即期類（isClearance=true）
//      Fallback：rrItem.warrantyExpiredAt = null 但 part 有 shelfLifeMonths（覆寫族群 default）
//                → 用「rr.rrDate + shelfLifeMonths」推算到期日
//   ③ 警示：suggested ≤ cost (avgCost) → belowCost；suggested < minPrice → belowMinPrice
//          兩者沿用既有 belowMinReason 範式（QuoteService 第 161 行起）
//   ④ 出清/即期破底線本來就會發生、填理由放行（不擋業務）

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

const GRADE_PRICE_MAP: Record<string, 'priceA' | 'priceB' | 'priceC' | 'priceD'> = {
  A: 'priceA',
  B: 'priceB',
  C: 'priceC',
  D: 'priceD',
};

export interface ResolvePriceArgs {
  customerId: string;
  partId: string;
  qty: string | number;
  asOfDate?: string;
  rrItemId?: string;
  warehouseId?: string;
}

type CandidateSource = 'NORMAL' | 'PROMOTION' | 'EXPIRY';

export interface PriceCandidate {
  source: CandidateSource;
  price: string;
  code?: string;
  name?: string;
  promotionId?: string;
  isClearance?: boolean;
}

export interface ExpiryInfo {
  rrItemId: string | null;
  warrantyExpiredAt: string | null;
  effectiveExpiry: string | null;
  remainingDays: number | null;
  thresholdDays: number;
  isExpiring: boolean;
  fallbackUsed: boolean;
}

export interface ResolvePriceResult {
  partId: string;
  customerId: string;
  qty: string;
  asOfDate: string;
  normalPrice: string | null;
  normalPriceSource: 'GRADE_PRICE' | 'NONE';
  gradeCode: string | null;
  candidates: PriceCandidate[];
  applicablePromotions: PriceCandidate[];
  suggested: PriceCandidate;
  expiry: ExpiryInfo;
  cost: string | null;
  minPrice: string | null;
  belowCost: boolean;
  belowMinPrice: boolean;
}

@Injectable()
export class PromotionEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /** 推算批號有效到期日：rrItem.warrantyExpiredAt 優先；fallback = rr.rrDate + effective shelfLifeMonths */
  private computeEffectiveExpiry(
    rrItemWarrantyExpiredAt: Date | null,
    rrDate: Date | null,
    partShelfLifeMonths: number | null,
    partGroupDefaultShelfLifeMonths: number | null,
  ): { effective: Date | null; fallbackUsed: boolean } {
    if (rrItemWarrantyExpiredAt) {
      return { effective: rrItemWarrantyExpiredAt, fallbackUsed: false };
    }
    const months = partShelfLifeMonths ?? partGroupDefaultShelfLifeMonths;
    if (!rrDate || !months || months <= 0) {
      return { effective: null, fallbackUsed: false };
    }
    const d = new Date(rrDate);
    d.setMonth(d.getMonth() + months);
    return { effective: d, fallbackUsed: true };
  }

  /** 客戶正常價：依 grade.code (A/B/C/D) 對應 part.priceA~D。沒分級 / 對應價 = null|0 → 不參與比較。 */
  private getNormalPrice(
    part: { priceA: PrismaNs.Decimal | null; priceB: PrismaNs.Decimal | null; priceC: PrismaNs.Decimal | null; priceD: PrismaNs.Decimal | null },
    gradeCode: string | null,
  ): PrismaNs.Decimal | null {
    if (!gradeCode) return null;
    const key = GRADE_PRICE_MAP[gradeCode.toUpperCase()];
    if (!key) return null;
    const v = part[key];
    if (!v) return null;
    const d = new PrismaNs.Decimal(v);
    if (d.lte(0)) return null;
    return d;
  }

  /** minPrice = avgCost × (1 + (customMarginPct ?? grade.marginPct) / 100)；沿用 QuoteService 既有公式 */
  private computeMinPrice(
    avgCost: PrismaNs.Decimal | null,
    customMarginPct: PrismaNs.Decimal | null,
    gradeMarginPct: PrismaNs.Decimal | null,
  ): PrismaNs.Decimal | null {
    if (!avgCost || avgCost.lte(0)) return null;
    const margin = customMarginPct ?? gradeMarginPct;
    if (!margin) return null;
    return avgCost.mul(new PrismaNs.Decimal(margin).div(100).add(1)).toDecimalPlaces(4);
  }

  async resolvePrice(user: RequestUser, args: ResolvePriceArgs): Promise<ResolvePriceResult> {
    const tenantId = requireTenantId(user);
    const partId = args.partId.trim();
    const customerId = args.customerId.trim();
    const qty = new PrismaNs.Decimal(args.qty);
    const asOf = args.asOfDate ? new Date(args.asOfDate) : new Date();
    const asOfDateOnly = new Date(asOf.toISOString().slice(0, 10));

    // 1) 主體：part / customer / tenant 一次抓
    const [part, customer, tenant] = await Promise.all([
      this.prisma.nx01Part.findFirst({
        where: { id: partId, tenantId },
        select: {
          id: true,
          code: true,
          name: true,
          brandId: true,
          partGroupId: true,
          priceA: true,
          priceB: true,
          priceC: true,
          priceD: true,
          shelfLifeMonths: true,
          partGroup: { select: { defaultShelfLifeMonths: true } },
        },
      }),
      this.prisma.nx01Partner.findFirst({
        where: { id: customerId, tenantId },
        select: {
          id: true,
          customerGradeId: true,
          customMarginPct: true,
          customerGrade: { select: { code: true, marginPct: true } },
        },
      }),
      this.prisma.nx99Tenant.findUnique({
        where: { id: tenantId },
        select: { shelfLifeWarningDays: true },
      }),
    ]);
    if (!part) throw new NotFoundException(`Part ${partId} not found`);
    if (!customer) throw new NotFoundException(`Customer ${customerId} not found`);
    const thresholdDays = tenant?.shelfLifeWarningDays ?? 30;

    const gradeCode = customer.customerGrade?.code ?? null;
    const normalPrice = this.getNormalPrice(part, gradeCode);

    // 2) 即期偵測（rrItemId 給才查；無 rrItemId 此版不掃整庫）
    let expiry: ExpiryInfo = {
      rrItemId: null,
      warrantyExpiredAt: null,
      effectiveExpiry: null,
      remainingDays: null,
      thresholdDays,
      isExpiring: false,
      fallbackUsed: false,
    };
    if (args.rrItemId) {
      const rrItem = await this.prisma.nx02RrItem.findFirst({
        where: { id: args.rrItemId.trim(), partId },
        select: {
          id: true,
          warrantyExpiredAt: true,
          rr: { select: { rrDate: true, tenantId: true } },
        },
      });
      if (!rrItem || rrItem.rr.tenantId !== tenantId) {
        throw new BadRequestException(`rrItemId ${args.rrItemId} not found for this tenant/part`);
      }
      const { effective, fallbackUsed } = this.computeEffectiveExpiry(
        rrItem.warrantyExpiredAt,
        rrItem.rr.rrDate,
        part.shelfLifeMonths,
        part.partGroup?.defaultShelfLifeMonths ?? null,
      );
      const remainingDays =
        effective !== null
          ? Math.floor((effective.getTime() - asOfDateOnly.getTime()) / 86_400_000)
          : null;
      expiry = {
        rrItemId: rrItem.id,
        warrantyExpiredAt: rrItem.warrantyExpiredAt?.toISOString().slice(0, 10) ?? null,
        effectiveExpiry: effective?.toISOString().slice(0, 10) ?? null,
        remainingDays,
        thresholdDays,
        isExpiring: remainingDays !== null && remainingDays < thresholdDays,
        fallbackUsed,
      };
    }

    // 3) 適用促銷：scope 命中（P=partId / B=brandId / G=partGroupId）+ 時段 + 啟用 + qty 滿足
    const scopeOrs: PrismaNs.Nx04PromotionScopeWhereInput[] = [
      { scopeType: 'P', scopeId: partId },
    ];
    if (part.brandId) scopeOrs.push({ scopeType: 'B', scopeId: part.brandId });
    if (part.partGroupId) scopeOrs.push({ scopeType: 'G', scopeId: part.partGroupId });

    const promos = await this.prisma.nx04Promotion.findMany({
      where: {
        tenantId,
        isActive: true,
        validFrom: { lte: asOfDateOnly },
        validTo: { gte: asOfDateOnly },
        scopes: { some: { tenantId, OR: scopeOrs } },
      },
      select: {
        id: true,
        code: true,
        name: true,
        priceOverride: true,
        isClearance: true,
        minBuyQty: true,
      },
    });

    const applicablePromotions: PriceCandidate[] = [];
    for (const p of promos) {
      // minBuyQty 條件（null = 無門檻）
      if (p.minBuyQty && qty.lt(new PrismaNs.Decimal(p.minBuyQty))) continue;
      // 即期類規則：只在 isExpiring 時生效；非即期類：批號不即期才生效（即期批照樣可比 normal、保留 VIP 價）
      // 設計：fresh batch（含無 rrItemId 情境）→ 排除 isClearance；expiring batch → 全部納入
      if (p.isClearance && !expiry.isExpiring) continue;
      applicablePromotions.push({
        source: p.isClearance ? 'EXPIRY' : 'PROMOTION',
        price: p.priceOverride.toString(),
        code: p.code,
        name: p.name,
        promotionId: p.id,
        isClearance: p.isClearance,
      });
    }

    // 4) 候選池：normal + 所有適用促銷
    const candidates: PriceCandidate[] = [];
    if (normalPrice) {
      candidates.push({
        source: 'NORMAL',
        price: normalPrice.toString(),
        name: `客戶分級 ${gradeCode} 建議價`,
      });
    }
    candidates.push(...applicablePromotions);

    // 5) 取最低
    let suggested: PriceCandidate;
    if (candidates.length === 0) {
      // 完全沒分級價也沒促銷：suggested = 0（前端要求 operator 自填）
      suggested = { source: 'NORMAL', price: '0', name: '無建議價（手動輸入）' };
    } else {
      suggested = candidates.reduce((min, c) =>
        new PrismaNs.Decimal(c.price).lt(new PrismaNs.Decimal(min.price)) ? c : min,
      );
    }

    // 6) cost / minPrice 警示（warehouseId 給才查 stock_balance；不給用任意有 avgCost > 0 的批）
    let avgCost: PrismaNs.Decimal | null = null;
    const balanceWhere: PrismaNs.Nx03StockBalanceWhereInput = { tenantId, partId };
    if (args.warehouseId) balanceWhere.warehouseId = args.warehouseId.trim();
    const balances = await this.prisma.nx03StockBalance.findMany({
      where: balanceWhere,
      select: { avgCost: true },
    });
    for (const b of balances) {
      const c = new PrismaNs.Decimal(b.avgCost);
      if (c.gt(0)) {
        avgCost = avgCost ? (c.lt(avgCost) ? c : avgCost) : c;
      }
    }
    const minPrice = this.computeMinPrice(
      avgCost,
      customer.customMarginPct ? new PrismaNs.Decimal(customer.customMarginPct) : null,
      customer.customerGrade?.marginPct ? new PrismaNs.Decimal(customer.customerGrade.marginPct) : null,
    );
    const suggestedDec = new PrismaNs.Decimal(suggested.price);

    return {
      partId,
      customerId,
      qty: qty.toString(),
      asOfDate: asOfDateOnly.toISOString().slice(0, 10),
      normalPrice: normalPrice?.toString() ?? null,
      normalPriceSource: normalPrice ? 'GRADE_PRICE' : 'NONE',
      gradeCode,
      candidates,
      applicablePromotions,
      suggested,
      expiry,
      cost: avgCost?.toString() ?? null,
      minPrice: minPrice?.toString() ?? null,
      belowCost: avgCost !== null && suggestedDec.lte(avgCost),
      belowMinPrice: minPrice !== null && suggestedDec.lt(minPrice),
    };
  }
}
