// apps/nx-ui/src/features/sale/ui/fulfillment/sysC.ts
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 5:SYS-C 備貨分流判斷邏輯。
 *
 * 依 SO 明細 + 各料號當前多倉庫存,判斷出 4 種情境:
 *   A:全部本倉有貨       → 直接建 PK
 *   B:本倉不足,他倉可補 → 建 IT 調撥單,完成後建 PK
 *   C:含 inquiry 項目     → 建 TI 調貨單,完成後建 PK(本倉品項一起出)
 *   D:同時需 IT + TI      → 兩條線並行,全部完成才建 PK
 *
 * 任何一項若全公司庫存都不夠、且非 inquiry 項目 → throw(SOP 應先走缺貨分流)。
 * 多倉掃描順序:hsinchu → taichung(spec 未指定,採就近原則,未來可依倉別距離排序)。
 */

import { PART_BY_SKU } from '../sop-workspace/mock-data/parts';
import type { SOItem, SupplyAnalysis, WarehouseKey } from './types';

const OTHER_WAREHOUSES: readonly WarehouseKey[] = ['hsinchu', 'taichung'];

export function analyzeSO(items: readonly SOItem[]): SupplyAnalysis {
  const transferPlan: SupplyAnalysis['transferPlan'] = [];
  const inquiryPlan: SupplyAnalysis['inquiryPlan'] = [];

  for (const item of items) {
    if (item.source === 'inquiry') {
      inquiryPlan.push({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        vendorId: item.adoptedVendorId,
        vendorName: item.adoptedVendorName,
        unitCost: item.unitCost,
        sourceRfqNumber: item.sourceRfqNumber,
        sourceQtNumber: item.sourceQtNumber,
      });
      continue;
    }

    const part = PART_BY_SKU[item.sku];
    if (!part) {
      throw new Error(`[SYS-C] 找不到料號 ${item.sku}`);
    }

    if (part.stocks.main >= item.quantity) {
      continue;
    }

    let remaining = item.quantity - part.stocks.main;
    for (const wh of OTHER_WAREHOUSES) {
      if (remaining <= 0) break;
      const available = part.stocks[wh];
      if (available <= 0) continue;
      const take = Math.min(available, remaining);
      transferPlan.push({
        sku: item.sku,
        name: item.name,
        fromWarehouse: wh,
        quantity: take,
      });
      remaining -= take;
    }

    if (remaining > 0) {
      throw new Error(
        `[SYS-C] SO 含全公司無庫存的品項 ${item.sku},應先走缺貨分流建 RFQ`,
      );
    }
  }

  const needsTransfer = transferPlan.length > 0;
  const needsInquiry = inquiryPlan.length > 0;
  const scenario =
    !needsTransfer && !needsInquiry
      ? 'A'
      : needsTransfer && !needsInquiry
        ? 'B'
        : !needsTransfer && needsInquiry
          ? 'C'
          : 'D';

  return {
    scenario,
    needsTransfer,
    needsInquiry,
    transferPlan,
    inquiryPlan,
  };
}
