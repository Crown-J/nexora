// apps/nx-api/src/sys-admin/importer/handlers/sale-history.handler.ts
// v1.2 對齊軌 C-FU FU-import-05：銷貨歷史 importer
// 範式同 purchase-history、只是廠商換客戶

import type { HandlerContext, HandlerResult, ImportRow } from './base';
import { parseDate, parseNumber } from './base';

export interface HistoricalSaleRow {
  date: string;
  partnerId: string;
  partnerName: string;
  partId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  isBeforeStartDate: boolean;
}

export async function importSaleHistory(
  ctx: HandlerContext,
  rows: ImportRow[],
): Promise<HandlerResult & { historicalRows?: HistoricalSaleRow[] }> {
  const result: HandlerResult & { historicalRows: HistoricalSaleRow[] } = {
    imported: 0,
    historicalCount: 0,
    errors: [],
    historicalRows: [],
  };

  const partnerCache = new Map<string, { id: string; type: string } | null>();
  const productCache = new Map<string, { id: string } | null>();

  for (const { rowNo, data } of rows) {
    const date = parseDate(data.date);
    if (!date) {
      result.errors.push({ rowNo, reason: `日期格式錯誤（${data.date}）` });
      continue;
    }
    if (!data.partnerName || !data.productName) {
      result.errors.push({ rowNo, reason: '客戶 / 產品名稱必填' });
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

    // 找客戶（partnerType IN ('C', 'O')、銷售對象）
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
        reason: `找不到客戶「${data.partnerName}」（請先匯入客戶廠商範本）`,
      });
      continue;
    }

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
