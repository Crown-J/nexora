// apps/nx-api/src/nx03/auto-replenish/ar-calculator.service.ts
// AR 自動補貨計算引擎（4 階段、本 commit 落地 Stage 1+2）
// 對齊 overview §3.2 計算引擎核心邏輯
//
// Stage 1 偵測需求：scan stock_balance × part_stock_setting WHERE onHand < safetyQty
// Stage 2 計算需求量：對 part_model 維度撈近 N 天 stock_ledger（source=S 純銷貨）
//                     → 平均每日出貨 × lead time = forecastQty
//
// Stage 3 兩層分類分配（commit 2 補）
// Stage 4 副廠池內銷貨比例分配（commit 2 補）
// application 替代品牌邏輯（commit 3 補）

import { Injectable } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import { PartReplacementService } from './part-replacement.service';

/** 預設平均出貨計算窗口（天數、PartStockSetting.calculationWindowDays 為 null 時用）。 */
export const DEFAULT_CALCULATION_WINDOW_DAYS = 90;

/** 預設採購 lead time（天數、Crown 後續拍板可加 schema 欄、目前業界中位）。 */
export const DEFAULT_LEAD_TIME_DAYS = 7;

/** Stage 1 偵測結果：低於安全量的候選 part × warehouse。 */
export type ShortageCandidate = {
  partId: string;
  warehouseId: string;
  onHandQty: PrismaNs.Decimal;
  safetyQty: PrismaNs.Decimal;
  /** safetyQty - onHandQty（缺貨量）。 */
  gap: PrismaNs.Decimal;
  /** part_model 反查得到的 modelId（null = 無車型對應、純 partId 維度算）。 */
  modelId: string | null;
  /** 平均出貨計算窗口（PartStockSetting.calculationWindowDays、null fallback 90）。 */
  windowDays: number;
};

/** Stage 2 計算結果：跨 part_model 維度的預估需求量。 */
export type ForecastResult = {
  candidate: ShortageCandidate;
  /** 撈 ledger 的 SUM(qtyOut) 範圍：[now - windowDays, now]、source=S 純銷貨。 */
  totalShippedInWindow: PrismaNs.Decimal;
  /** totalShippedInWindow / windowDays。 */
  avgDailyShipped: PrismaNs.Decimal;
  leadTimeDays: number;
  /** avgDailyShipped × leadTimeDays（4 位精度）。 */
  forecastQty: PrismaNs.Decimal;
};

/** Stage 3 兩層分類結果：總需求拆 OE + 副廠。 */
export type AllocationResult = {
  forecast: ForecastResult;
  oemQty: PrismaNs.Decimal;
  aftermarketQty: PrismaNs.Decimal;
  oemRatio: PrismaNs.Decimal;
  aftermarketRatio: PrismaNs.Decimal;
  /** 配比規則來源：S=system / M=manual / DEFAULT=找不到規則用 0.5:0.5。 */
  ruleSource: 'S' | 'M' | 'DEFAULT';
  /** 套用的 BrandAllocationRule id（null=DEFAULT fallback）。 */
  ruleId: string | null;
};

/** Stage 4 副廠池分配結果：每副廠 part 一行。 */
export type AftermarketBrandBreakdown = {
  partId: string;
  /** 該 part 的品牌（null = 無 partBrandId、罕見）。 */
  partBrandId: string | null;
  /** 該 part 近 windowDays 內 source=S 銷貨量。 */
  shippedInWindow: PrismaNs.Decimal;
  /** 該 part 佔副廠池銷貨比例（0.0~1.0）。 */
  shareRatio: PrismaNs.Decimal;
  /** aftermarketQty × shareRatio（4 位精度）。 */
  suggestedQty: PrismaNs.Decimal;
};

@Injectable()
export class ArCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partReplacement: PartReplacementService,
  ) {}

  /**
   * Stage 1 偵測需求：找 onHand < safetyQty 的所有 part × warehouse 組合
   *   - 跳過 minQty=0（不限制）
   *   - 跳過 isActive=false 的 setting
   *   - 反查 part_model 第一個 active 拿 modelId（給 Stage 2 跨品牌彙整用）
   *
   * @param tenantId 租戶
   * @param warehouseId 可選、指定倉庫（cron 按倉觸發時用）、undefined=全倉
   */
  async detectShortageCandidates(
    tenantId: string,
    warehouseId?: string,
  ): Promise<ShortageCandidate[]> {
    const settings = await this.prisma.nx03PartStockSetting.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: {
        partId: true,
        warehouseId: true,
        minQty: true,
        calculationWindowDays: true,
      },
    });

    const candidates: ShortageCandidate[] = [];
    for (const setting of settings) {
      const safetyQty = new PrismaNs.Decimal(setting.minQty);
      if (safetyQty.lte(0)) continue; // 0=不限制

      const balance = await this.prisma.nx03StockBalance.findFirst({
        where: {
          tenantId,
          partId: setting.partId,
          warehouseId: setting.warehouseId,
        },
        select: { onHandQty: true },
      });
      const onHand = balance
        ? new PrismaNs.Decimal(balance.onHandQty)
        : new PrismaNs.Decimal(0);

      if (onHand.gte(safetyQty)) continue; // 不缺貨

      // 反查 part_model 第一個 active（多 model 適配時取第一個、後續可升「全 model 集合」算）
      const pm = await this.prisma.nx01PartModel.findFirst({
        where: {
          tenantId,
          partId: setting.partId,
          isActive: true,
        },
        select: { modelId: true },
      });

      candidates.push({
        partId: setting.partId,
        warehouseId: setting.warehouseId,
        onHandQty: onHand,
        safetyQty,
        gap: safetyQty.sub(onHand),
        modelId: pm?.modelId ?? null,
        windowDays: setting.calculationWindowDays ?? DEFAULT_CALCULATION_WINDOW_DAYS,
      });
    }
    return candidates;
  }

  /**
   * Stage 2 計算需求量：對 part_model 維度撈近 N 天 stock_ledger 銷貨、算平均 × lead time
   *
   *   - 跨品牌彙整：找 modelId 下所有 parts、SUM 它們的 source=S/movementType=O ledger
   *   - 若 modelId=null：純 partId 維度算（無跨品牌彙整）
   *   - 排除 X 調撥（純算 source=S 銷貨、對齊 overview §3.2 拍板）
   *   - lead time 採 DEFAULT_LEAD_TIME_DAYS（schema 0 欄、後續可升）
   *
   * @param tenantId 租戶
   * @param candidate Stage 1 產出的候選
   * @param leadTimeDays 採購 lead time（預設 7 天）
   */
  async calculateForecastQty(
    tenantId: string,
    candidate: ShortageCandidate,
    leadTimeDays = DEFAULT_LEAD_TIME_DAYS,
  ): Promise<ForecastResult> {
    // 1. 找跨品牌 partIds 集合
    let partIds: string[] = [candidate.partId];
    if (candidate.modelId) {
      const partModels = await this.prisma.nx01PartModel.findMany({
        where: {
          tenantId,
          modelId: candidate.modelId,
          isActive: true,
        },
        select: { partId: true },
      });
      partIds = Array.from(new Set([...partIds, ...partModels.map((pm) => pm.partId)]));
    }

    // 2. 計算窗口時間範圍
    const since = new Date();
    since.setDate(since.getDate() - candidate.windowDays);

    // 3. 加總 source=S 純銷貨出庫（排除 X 調撥、overview §3.2 拍板）
    const agg = await this.prisma.nx03StockLedger.aggregate({
      where: {
        tenantId,
        partId: { in: partIds },
        sourceDocType: 'S',
        movementType: 'O',
        movementDate: { gte: since },
      },
      _sum: { qtyOut: true },
    });
    const totalShipped = new PrismaNs.Decimal(agg._sum.qtyOut ?? 0);

    // 4. 平均每日 × lead time
    const avgDaily =
      candidate.windowDays > 0
        ? totalShipped.div(candidate.windowDays)
        : new PrismaNs.Decimal(0);
    const forecastQty = avgDaily.mul(leadTimeDays).toDecimalPlaces(4);

    return {
      candidate,
      totalShippedInWindow: totalShipped,
      avgDailyShipped: avgDaily,
      leadTimeDays,
      forecastQty,
    };
  }

  /**
   * Stage 3 兩層分類分配：總需求 × BrandAllocationRule → OE 量 + 副廠量
   *
   *   - Crown Q-S1=A manual 優先：先找 source='M' active rule、再找 'S' active rule
   *   - rule valid 期間判：validFrom <= today AND (validTo IS NULL OR today <= validTo)
   *   - modelId=null 或找不到 rule：fallback 0.5:0.5（ruleSource='DEFAULT'）
   *   - 同 model 多 manual rule 取最新 validFrom（schema unique 限同 validFrom）
   *
   * @param tenantId 租戶
   * @param forecast Stage 2 產出
   */
  async classifyByOemAftermarket(
    tenantId: string,
    forecast: ForecastResult,
  ): Promise<AllocationResult> {
    const { modelId } = forecast.candidate;
    let oemRatio = new PrismaNs.Decimal('0.5');
    let aftermarketRatio = new PrismaNs.Decimal('0.5');
    let ruleSource: 'S' | 'M' | 'DEFAULT' = 'DEFAULT';
    let ruleId: string | null = null;

    if (modelId) {
      const today = new Date();
      // Crown Q-S1=A manual 優先：先 M、再 S
      for (const sourcePriority of ['M', 'S'] as const) {
        const rule = await this.prisma.nx03BrandAllocationRule.findFirst({
          where: {
            tenantId,
            modelId,
            source: sourcePriority,
            isActive: true,
            validFrom: { lte: today },
            OR: [{ validTo: null }, { validTo: { gte: today } }],
          },
          orderBy: { validFrom: 'desc' }, // 同 source 多版本取最新
          select: { id: true, oemRatio: true, aftermarketRatio: true, source: true },
        });
        if (rule) {
          oemRatio = new PrismaNs.Decimal(rule.oemRatio);
          aftermarketRatio = new PrismaNs.Decimal(rule.aftermarketRatio);
          ruleSource = sourcePriority;
          ruleId = rule.id;
          break;
        }
      }
    }

    const oemQty = forecast.forecastQty.mul(oemRatio).toDecimalPlaces(4);
    const aftermarketQty = forecast.forecastQty.mul(aftermarketRatio).toDecimalPlaces(4);

    return {
      forecast,
      oemQty,
      aftermarketQty,
      oemRatio,
      aftermarketRatio,
      ruleSource,
      ruleId,
    };
  }

  /**
   * Stage 4 副廠池內按銷貨比例分配：副廠量 × 各 part 近 N 天銷貨佔比
   *
   *   - 找 modelId 下所有 isOem=false 的 parts（副廠池）
   *   - 對每 part 算 windowDays 內 source=S 銷貨量
   *   - shareRatio = part_shipped / total_aftermarket_shipped
   *   - 全副廠池銷貨 = 0 時：均分（avoid div by 0）
   *   - modelId=null：回 []（無跨品牌池可分）
   *
   * @param tenantId 租戶
   * @param allocation Stage 3 產出
   */
  async distributeAftermarketPool(
    tenantId: string,
    allocation: AllocationResult,
  ): Promise<AftermarketBrandBreakdown[]> {
    const { modelId, windowDays } = allocation.forecast.candidate;
    if (!modelId) return [];
    if (allocation.aftermarketQty.lte(0)) return [];

    // 1. 找 model 下副廠池（fitLevel=2 副廠等效、isOem=false、commit 3 refactor 用 PartReplacementService）
    const aftermarketReplacements = await this.partReplacement.findAftermarketAlternatives(
      tenantId,
      modelId,
    );
    if (!aftermarketReplacements.length) return [];

    // 2. 對每 part 算 windowDays 內 source=S 銷貨
    const since = new Date();
    since.setDate(since.getDate() - windowDays);

    const shippedByPart: Array<{ partId: string; partBrandId: string | null; shipped: PrismaNs.Decimal }> = [];
    for (const rep of aftermarketReplacements) {
      const agg = await this.prisma.nx03StockLedger.aggregate({
        where: {
          tenantId,
          partId: rep.partId,
          sourceDocType: 'S',
          movementType: 'O',
          movementDate: { gte: since },
        },
        _sum: { qtyOut: true },
      });
      shippedByPart.push({
        partId: rep.partId,
        partBrandId: rep.partBrandId,
        shipped: new PrismaNs.Decimal(agg._sum.qtyOut ?? 0),
      });
    }

    // 3. 加總 + 算佔比 + 分配
    const totalShipped = shippedByPart.reduce(
      (acc, r) => acc.add(r.shipped),
      new PrismaNs.Decimal(0),
    );

    const breakdowns: AftermarketBrandBreakdown[] = [];
    if (totalShipped.lte(0)) {
      // 全副廠池銷貨 = 0：均分（避免 div by 0、業界 fallback）
      const evenShare = new PrismaNs.Decimal(1).div(shippedByPart.length);
      for (const r of shippedByPart) {
        breakdowns.push({
          partId: r.partId,
          partBrandId: r.partBrandId,
          shippedInWindow: r.shipped,
          shareRatio: evenShare,
          suggestedQty: allocation.aftermarketQty.mul(evenShare).toDecimalPlaces(4),
        });
      }
    } else {
      for (const r of shippedByPart) {
        const shareRatio = r.shipped.div(totalShipped);
        breakdowns.push({
          partId: r.partId,
          partBrandId: r.partBrandId,
          shippedInWindow: r.shipped,
          shareRatio,
          suggestedQty: allocation.aftermarketQty.mul(shareRatio).toDecimalPlaces(4),
        });
      }
    }
    return breakdowns;
  }
}
