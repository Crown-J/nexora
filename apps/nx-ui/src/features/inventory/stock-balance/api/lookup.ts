// apps/nx-ui/src/features/nx03/stock-balance/api/lookup.ts
/**
 * T4 進貨對齊批次 2026-06-08：庫存即時查詢 lookup helper。
 *
 * 用途：RR 驗收頁顯示「此料目前庫存 X 顆」、讓驗收人秒判斷有沒有囤貨。
 * 純前端 join、不動 schema、純讀取現有 Nx03StockBalance 表。
 *
 * 後端：apps/nx-api/src/nx03/stock-balance（GET /nx03/stock-balance?partId=&warehouseId=）
 *  · 唯一鍵 (tenantId, partId, warehouseId) → 一次最多回 1 筆
 *  · onHandQty 可能為負值（庫存赤字、業務語意需提示）
 */

import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';
import { buildQueryString } from '@data/api/query';

export type StockBalanceLookup = {
  onHandQty: number;
  availableQty: number;
  reservedQty: number;
};

/** 取單一料件在單一倉庫的當下庫存；找不到回 null（=該倉從未進過此料）。 */
export async function lookupStockBalance(
  partId: string,
  warehouseId: string,
): Promise<StockBalanceLookup | null> {
  if (!partId.trim() || !warehouseId.trim()) return null;
  const qs = buildQueryString({
    partId: partId.trim(),
    warehouseId: warehouseId.trim(),
    pageSize: '1',
  });
  const res = await apiFetch(`/nx03/stock-balance${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx03_stock_balance_lookup_001');
  const data = (await res.json()) as {
    items?: { onHandQty: number | string; availableQty: number | string; reservedQty: number | string }[];
    rows?: { onHandQty: number | string; availableQty: number | string; reservedQty: number | string }[];
  };
  const list = data.items ?? data.rows ?? [];
  const r = list[0];
  if (!r) return null;
  return {
    onHandQty: Number(r.onHandQty),
    availableQty: Number(r.availableQty),
    reservedQty: Number(r.reservedQty),
  };
}
