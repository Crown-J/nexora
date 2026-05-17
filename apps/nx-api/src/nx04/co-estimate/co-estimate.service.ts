// apps/nx-api/src/nx04/co-estimate/co-estimate.service.ts
// NX04 CoEstimate service（客訂預估價系統算）
//
// 對齊：
//   - overview §9 客訂預估價（Crown Q-NX04-C=B 系統算）
//   - Crown 拍板「業務員不用憑經驗、系統算」
//   - 對齊 NX02 PriceComparisonService 90 天歷史 weighted avg 範式
//
// 公式（overview §9.2）：
//   客訂預估價 = max(
//     歷史採購成本均價 × (1 + 客戶等級毛利率)
//     ,
//     part 等級對應 priceA~D 售價（無歷史時 fallback、業界既有定價）
//   )
//
// 業務語意：
//   - 客訂單 = 客戶要的料目前缺貨、要採購商承諾預訂
//   - 不走詢價（直接報定價、業務員不用憑經驗）
//   - 業務員可手動覆寫（service 純算出建議價、SO 建單時可改）

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { EstimatePriceDto } from './dto/co-estimate.dto';

const DEFAULT_LOOKBACK_DAYS = 90;

/** 客戶等級 code → part 對應 priceX 欄位 mapping（A/B/C/D 對應）。 */
function pickGradePrice(
  part: { priceA: PrismaNs.Decimal | null; priceB: PrismaNs.Decimal | null; priceC: PrismaNs.Decimal | null; priceD: PrismaNs.Decimal | null },
  gradeCode: string | null | undefined,
): PrismaNs.Decimal {
  const code = (gradeCode ?? 'D').toUpperCase();
  switch (code) {
    case 'A':
      return new PrismaNs.Decimal(part.priceA ?? 0);
    case 'B':
      return new PrismaNs.Decimal(part.priceB ?? 0);
    case 'C':
      return new PrismaNs.Decimal(part.priceC ?? 0);
    case 'D':
    default:
      return new PrismaNs.Decimal(part.priceD ?? 0);
  }
}

@Injectable()
export class CoEstimateService {
  constructor(private readonly prisma: PrismaService) {}

  async estimate(user: RequestUser, dto: EstimatePriceDto) {
    const tenantId = requireTenantId(user);
    const customerId = dto.customerId.trim();
    const partId = dto.partId.trim();
    const qty = new PrismaNs.Decimal(dto.qty ?? 1);
    const lookbackDays = dto.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;

    // load customer + customerGrade（取 marginPct）
    const customer = await this.prisma.nx01Partner.findFirst({
      where: { id: customerId, tenantId },
      select: {
        id: true,
        partnerType: true,
        customerGradeId: true,
        customerGrade: { select: { code: true, name: true, marginPct: true } },
      },
    });
    if (!customer) throw new NotFoundException('customerId not found in tenant');
    if (customer.partnerType !== 'C') {
      throw new BadRequestException(
        `customerId must be partner_type='C' (客戶), got '${customer.partnerType}'`,
      );
    }
    const marginPct = customer.customerGrade
      ? new PrismaNs.Decimal(customer.customerGrade.marginPct)
      : new PrismaNs.Decimal(20); // 無等級 default 20% 毛利（業界一般客戶）

    // load part + priceA~D fallback
    const part = await this.prisma.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        isOem: true,
        priceA: true,
        priceB: true,
        priceC: true,
        priceD: true,
      },
    });
    if (!part) throw new NotFoundException('partId not found in tenant');

    // 歷史成本：90 天 PoItem weighted avg
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const historyRows = await this.prisma.nx02PoItem.findMany({
      where: {
        partId,
        po: { tenantId, poDate: { gte: cutoff }, voidedAt: null },
      },
      select: { qty: true, unitCost: true },
    });

    let historicalCost: PrismaNs.Decimal | null = null;
    if (historyRows.length > 0) {
      const sumQty = historyRows.reduce(
        (acc, r) => acc.add(new PrismaNs.Decimal(r.qty)),
        new PrismaNs.Decimal(0),
      );
      const sumCost = historyRows.reduce(
        (acc, r) => acc.add(new PrismaNs.Decimal(r.unitCost).mul(new PrismaNs.Decimal(r.qty))),
        new PrismaNs.Decimal(0),
      );
      if (sumQty.gt(0)) {
        historicalCost = sumCost.div(sumQty).toDecimalPlaces(4);
      }
    }

    // 等級對應 priceX（fallback 售價）
    const gradePriceX = pickGradePrice(part, customer.customerGrade?.code);

    // 計算 estimatedPrice = max(historicalCost × (1 + marginPct/100), gradePriceX)
    let costPlus: PrismaNs.Decimal | null = null;
    if (historicalCost) {
      const multiplier = new PrismaNs.Decimal(1).add(marginPct.div(100));
      costPlus = historicalCost.mul(multiplier).toDecimalPlaces(4);
    }

    let estimatedPrice: PrismaNs.Decimal;
    let basisLabel: string;
    if (costPlus && costPlus.gt(gradePriceX)) {
      estimatedPrice = costPlus;
      basisLabel = 'historical_cost_plus_margin';
    } else if (gradePriceX.gt(0)) {
      estimatedPrice = gradePriceX;
      basisLabel = 'part_grade_price';
    } else if (costPlus) {
      estimatedPrice = costPlus;
      basisLabel = 'historical_cost_plus_margin_only';
    } else {
      estimatedPrice = new PrismaNs.Decimal(0);
      basisLabel = 'no_data_available';
    }

    const totalEstimate = estimatedPrice.mul(qty).toDecimalPlaces(2);

    return {
      customer: {
        id: customer.id,
        customerGrade: customer.customerGrade
          ? { code: customer.customerGrade.code, name: customer.customerGrade.name }
          : null,
        marginPct: marginPct.toString(),
      },
      part: { id: part.id, code: part.code, name: part.name, isOem: part.isOem },
      windowMeta: { lookbackDays, historyRowCount: historyRows.length },
      estimate: {
        unitPrice: estimatedPrice.toString(),
        qty: qty.toString(),
        totalEstimate: totalEstimate.toString(),
        basis: basisLabel, // 'historical_cost_plus_margin' / 'part_grade_price' / 'no_data_available' 等
      },
      breakdown: {
        historicalCost: historicalCost?.toString() ?? null,
        costPlusMargin: costPlus?.toString() ?? null,
        gradePriceX: gradePriceX.toString(),
      },
    };
  }
}
