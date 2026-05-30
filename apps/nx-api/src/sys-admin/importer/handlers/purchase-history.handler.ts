// apps/nx-api/src/sys-admin/importer/handlers/purchase-history.handler.ts
// v1.2 對齊軌 C-FU FU-import-04：進貨歷史 importer
//
// ⚠️ 設計取捨：
// 完整 NX02 PO + RR 單據涉及 currency / taxRate / paymentTerm 等多必填欄位、
// 歷史匯入無法精確填、不適合直接寫 Nx02Po 表（會污染既有單據邏輯）。
// 範式：把歷史資料寫進 import_batch 內結構化 JSON、報表時依 dataStartDate 過濾。
// 真正要進 NX02 既有業務流（採購比價 / 自動 AR）的話、客戶建系統後從新一筆 RFQ 開始。
//
// v1.2 §12.3 起算點：
// - 起算之前的歷史 → 進 import_batch、只進查詢
// - 起算之後 → 同樣進 import_batch、可視為「初始未沖帳的應付」、屬 FU
//
// 此 importer 純驗證 + 統計、count = 通過 lookup 驗證的 row 數

import type { HandlerContext, HandlerResult, ImportRow } from './base';
import { parseDate, parseNumber } from './base';

export interface HistoricalPurchaseRow {
  date: string;
  partnerId: string;
  partnerName: string;
  partId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  isBeforeStartDate: boolean;
}

export async function importPurchaseHistory(
  ctx: HandlerContext,
  rows: ImportRow[],
): Promise<HandlerResult & { historicalRows?: HistoricalPurchaseRow[] }> {
  const result: HandlerResult & { historicalRows: HistoricalPurchaseRow[] } = {
    imported: 0,
    historicalCount: 0,
    errors: [],
    historicalRows: [],
  };

  // 暫存 partner / product lookup（避免每 row 都打 DB）
  const partnerCache = new Map<string, { id: string; type: string } | null>();
  const productCache = new Map<string, { id: string } | null>();

  for (const { rowNo, data } of rows) {
    const date = parseDate(data.date);
    if (!date) {
      result.errors.push({ rowNo, reason: `日期格式錯誤（${data.date}）` });
      continue;
    }
    if (!data.partnerName || !data.productName) {
      result.errors.push({ rowNo, reason: '廠商 / 產品名稱必填' });
      continue;
    }
    const qty = parseNumber(data.qty);
    const unitPrice = parseNumber(data.unitPrice);
    if (qty === null || qty <= 0) {
      result.errors.push({ rowNo, reason: `數量錯誤（${data.qty}）` });
      continue;
    }
    if (unitPrice === null || unitPrice < 0) {
      result.errors.push({ rowNo, reason: `單價錯誤（${data.unitPrice}）` });
      continue;
    }

    // 找廠商（partnerType IN ('S', 'V', 'O')、進貨來源）
    let partner = partnerCache.get(data.partnerName);
    if (partner === undefined) {
      const found = await ctx.prisma.nx01Partner.findFirst({
        where: {
          tenantId: ctx.tenantId,
          name: data.partnerName,
          isActive: true,
        },
        select: { id: true, partnerType: true },
      });
      partner = found ? { id: found.id, type: found.partnerType } : null;
      partnerCache.set(data.partnerName, partner);
    }
    if (!partner) {
      result.errors.push({
        rowNo,
        reason: `找不到廠商「${data.partnerName}」（請先匯入客戶廠商範本）`,
      });
      continue;
    }

    // 找產品
    let product = productCache.get(data.productName);
    if (product === undefined) {
      const found = await ctx.prisma.nx01Part.findFirst({
        where: {
          tenantId: ctx.tenantId,
          OR: [{ name: data.productName }, { code: data.productName }],
          isActive: true,
        },
        select: { id: true },
      });
      product = found ? { id: found.id } : null;
      productCache.set(data.productName, product);
    }
    if (!product) {
      result.errors.push({
        rowNo,
        reason: `找不到產品「${data.productName}」（請先匯入產品範本）`,
      });
      continue;
    }

    // 起算點判斷
    const isBeforeStartDate =
      ctx.dataStartDate !== null && date < ctx.dataStartDate;

    result.historicalRows!.push({
      date: date.toISOString().slice(0, 10),
      partnerId: partner.id,
      partnerName: data.partnerName,
      partId: product.id,
      productName: data.productName,
      qty,
      unitPrice,
      isBeforeStartDate,
    });

    if (isBeforeStartDate) result.historicalCount = (result.historicalCount ?? 0) + 1;
    result.imported++;
  }
  return result;
}
