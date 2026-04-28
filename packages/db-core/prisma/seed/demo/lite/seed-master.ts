// packages/db-core/prisma/seed/demo/lite/seed-master.ts
// @FUNCTION_CODE SYS-DEMO-LITE-002-F01
// LITE 誠心汽修 master 主檔 seed
//
// 對齊 Crown Q1 (客戶分級) / Q4 (LITE 1 業務) / Q5 (品牌混搭) / Q6 (起帳存)：
//   - 8 客戶（VIP 1 / 好 3 / 一般 3 / 觀察 1）
//   - 5 同行
//   - 13 個 demo part_brand（VW/Audi/.../GM）
//   - 13 個 brand_code_rule
//   - 50 part（VAG 35 / Asian 10 / Euro/US 5）
//   - 5 個 location（單倉 MW1 內）
//   - 50 stock_balance（金字塔 + 30% 缺貨）

import type { DemoContext } from '../lib/builders';
import {
  ensureBrandCodeRule,
  ensureLocation,
  ensurePart,
  ensurePartBrand,
  ensurePartner,
  ensureStockBalance,
} from '../lib/builders';
import {
  buildCustomers,
  buildInquiryPartners,
} from '../lib/customers-catalog';
import {
  buildPartCode,
  distributePartCounts,
  SUB_BRANDS,
} from '../lib/parts-catalog';
import { categoryByIndex, pricingForCategory } from '../lib/pricing';

export interface MasterResult {
  customers: Array<{ id: string; tier: string }>;
  inquiryPartners: Array<{ id: string; name: string }>;
  parts: Array<{ id: string; code: string; name: string; avgCost: number; unitPrice: number }>;
  locations: Array<{ id: string; warehouseId: string }>;
  stockBalanceCount: number;
}

const LITE_CUSTOMER_COUNT = 8;
const LITE_SUPPLIER_COUNT = 5;
const LITE_PART_COUNT = 50;
const LITE_LOCATIONS_PER_WAREHOUSE = 5;

export async function seedLiteMaster(
  ctx: DemoContext,
  tenantCode: 'LITE',
): Promise<MasterResult> {
  // ----- 1. 客戶（8 筆，VIP 1 / 好 3 / 一般 3 / 觀察 1）-----
  const customerSpecs = buildCustomers(tenantCode, LITE_CUSTOMER_COUNT);
  const customers: Array<{ id: string; tier: string }> = [];
  for (const spec of customerSpecs) {
    const partner = await ensurePartner(ctx, {
      code: spec.code,
      name: spec.name,
      type: 'C',
      gradeId: ctx.grades[spec.tier],
      paymentTerm: spec.paymentTerm,
      contactName: spec.contactName,
    });
    customers.push({ id: partner.id, tier: spec.tier });
  }

  // ----- 2. 同行（5 筆）-----
  const supplierSpecs = buildInquiryPartners(tenantCode, LITE_SUPPLIER_COUNT);
  const inquiryPartners: Array<{ id: string; name: string }> = [];
  for (const spec of supplierSpecs) {
    const partner = await ensurePartner(ctx, {
      code: spec.code,
      name: spec.name,
      type: 'S',
      contactName: spec.contactName,
    });
    inquiryPartners.push({ id: partner.id, name: spec.name });
  }

  // ----- 3. 13 個 demo part_brand + 13 個 brand_code_rule -----
  for (const sub of SUB_BRANDS) {
    const pb = await ensurePartBrand(ctx, { code: sub.brandCode, name: sub.name });
    ctx.partBrandIds[sub.name] = pb.id;
    await ensureBrandCodeRule(ctx, pb.id, `${sub.name} 編碼規則`);
  }

  // ----- 4. 50 個 part（VAG 35 / Asian 10 / Euro/US 5）-----
  const distribution = distributePartCounts(LITE_PART_COUNT);
  const parts: MasterResult['parts'] = [];
  let partGlobalIdx = 0;
  for (const sub of SUB_BRANDS) {
    const count = distribution[sub.name] ?? 0;
    if (count === 0) continue;
    const partBrandId = ctx.partBrandIds[sub.name];
    const codeRule = await ctx.prisma.nx01BrandCodeRule.findFirst({
      where: { tenantId: ctx.tenantId, partBrandId },
      select: { id: true },
    });
    if (!codeRule) throw new Error(`brand_code_rule for ${sub.name} not found`);

    for (let i = 0; i < count; i++) {
      const built = buildPartCode(sub.name, i);
      const part = await ensurePart(ctx, {
        code: built.code,
        name: built.name,
        codeRuleId: codeRule.id,
        partBrandId,
      });
      const category = categoryByIndex(partGlobalIdx, LITE_PART_COUNT);
      const pricing = pricingForCategory(category, partGlobalIdx + 1);
      parts.push({
        id: part.id,
        code: built.code,
        name: built.name,
        avgCost: pricing.avgCost,
        unitPrice: pricing.unitPrice,
      });
      partGlobalIdx++;
    }
  }

  // ----- 5. 每倉 5 個 location（LITE 單倉 MW1）-----
  const locations: Array<{ id: string; warehouseId: string }> = [];
  for (const wh of ctx.warehouses) {
    for (let i = 1; i <= LITE_LOCATIONS_PER_WAREHOUSE; i++) {
      const loc = await ensureLocation(ctx, {
        warehouseId: wh.id,
        code: `${wh.code}-A${String(i).padStart(2, '0')}`,
        name: `${wh.code} 區 A${i}`,
      });
      locations.push({ id: loc.id, warehouseId: wh.id });
    }
  }

  // ----- 6. 50 stock_balance（金字塔 + 30% 缺貨，Q6 拍板）-----
  // 熱門 20%：30~100 / 中等 50%：5~20 / 缺貨 30%：0~3
  let stockBalanceCount = 0;
  for (const wh of ctx.warehouses) {
    for (let idx = 0; idx < parts.length; idx++) {
      const part = parts[idx];
      const ratio = idx / parts.length;
      let onHandQty: number;
      if (ratio < 0.2) {
        onHandQty = 30 + Math.floor((idx * 17) % 71);
      } else if (ratio < 0.7) {
        onHandQty = 5 + Math.floor((idx * 13) % 16);
      } else {
        onHandQty = Math.floor((idx * 7) % 4);
      }
      await ensureStockBalance(ctx, {
        partId: part.id,
        warehouseId: wh.id,
        onHandQty,
        avgCost: part.avgCost,
      });
      stockBalanceCount++;
    }
  }

  return { customers, inquiryPartners, parts, locations, stockBalanceCount };
}
