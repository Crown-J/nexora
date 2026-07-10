// apps/nx-ui/src/data/endpoints/nx02/ti/api/ti.ts
// NX02-TI-SHELL：同行調貨單 API client（單據外殼用、對齊 rr/po client 範式：search/items）
//   ⛔ 無 createTi：TI 只能由 SO 缺貨行群組（createTiFromSo）/ 比價採用（adoptQt）產生

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type { Ti } from '@data/types/nx02/ti';

export type ListTiParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export async function listTi(params: ListTiParams): Promise<{ items: Ti[]; total: number }> {
  const q = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx02/ti${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_ti_list_001');
  const body = (await res.json()) as { items: Ti[]; total: number };
  return { items: body.items ?? [], total: body.total ?? 0 };
}

export async function getTi(id: string): Promise<Ti> {
  const res = await apiFetch(`/nx02/ti/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_ti_get_001');
  return (await res.json()) as Ti;
}

export type UpdateTiBody = {
  tiDate?: string;
  /** 狀態動作：SENT 發出 / REPLIED 同行已回覆（P/C 系統寫、作廢走 voidTi） */
  status?: string;
  taxRate?: number;
  remark?: string | null;
};

export async function updateTi(id: string, body: UpdateTiBody): Promise<Ti> {
  const res = await apiFetch(`/nx02/ti/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_ti_update_001');
  return (await res.json()) as Ti;
}

/** 作廢（連動來源銷貨缺貨行退回待補、可重新找別家同行） */
export async function voidTi(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/ti/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx02_ti_void_001');
}

export type PatchTiItemBody = {
  qty?: number;
  /** 同行回價回填（寫入 unit_cost） */
  unitPriceSnapshot?: number;
  locationId?: string | null;
  remark?: string | null;
};

export async function patchTiItem(tiId: string, itemId: string, body: PatchTiItemBody): Promise<unknown> {
  const res = await apiFetch(`/nx02/ti/${encodeURIComponent(tiId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_ti_patch_item_001');
  return res.json();
}

/** 移除明細行（僅草稿；連動來源銷貨行退回待補） */
export async function removeTiItem(tiId: string, itemId: string): Promise<void> {
  const res = await apiFetch(`/nx02/ti/${encodeURIComponent(tiId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_nx02_ti_remove_item_001');
}

export type TiToRrBody = {
  warehouseId: string;
  items: { tiItemId: string; qty: number; locationId: string }[];
};

/** 轉進貨：建草稿進貨單（供應商=同行、tiId 回鏈）→ TI → 待驗收；應付由進貨過帳認列 */
export async function tiToRr(id: string, body: TiToRrBody): Promise<{ id: string; docNo?: string }> {
  const res = await apiFetch(`/nx02/ti/${encodeURIComponent(id)}/to-rr`, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_ti_to_rr_001');
  return (await res.json()) as { id: string; docNo?: string };
}
