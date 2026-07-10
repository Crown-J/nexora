// apps/nx-ui/src/data/endpoints/nx02/rr/api/rr.ts
// NX02-RR-SHELL：進貨單 API client（單據外殼用、對齊 so/sales-return client 範式）
//   與舊 data/endpoints/nx02/api/rr.ts 並存：舊檔給舊視圖（q/rows 錯位、Step 4 退場）、本檔走 search/items

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type { Rr } from '@data/types/nx02/rr';

export type ListRrParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export async function listRr(params: ListRrParams): Promise<{ items: Rr[]; total: number }> {
  const q = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx02/rr${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_rr_list_002');
  const body = (await res.json()) as { items: Rr[]; total: number };
  return { items: body.items ?? [], total: body.total ?? 0 };
}

export async function getRr(id: string): Promise<Rr> {
  const res = await apiFetch(`/nx02/rr/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_rr_get_002');
  return (await res.json()) as Rr;
}

export type CreateRrItemBody = {
  partId: string;
  locationId: string;
  qty: number;
  /** 單位成本（寫入 unit_cost） */
  unitPriceSnapshot: number;
  expectedQty?: number;
  actualQty?: number | null;
  defectQty?: number;
  defectType?: 'D' | 'F' | 'W' | 'O' | null;
  defectDesc?: string | null;
  batchNo?: string | null;
  warrantyExpiredAt?: string | null;
  remark?: string;
};

export type CreateRrBody = {
  rrDate: string;
  warehouseId: string;
  supplierId: string;
  rfqId?: string;
  poId?: string;
  currencyId?: string;
  taxRate?: number;
  remark?: string;
  /** 後端要求至少 1 行（手動建單帶首行明細；採購單路徑走 poToRr） */
  items: CreateRrItemBody[];
};

export async function createRr(body: CreateRrBody): Promise<Rr> {
  const res = await apiFetch('/nx02/rr', { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_rr_create_002');
  return (await res.json()) as Rr;
}

export type UpdateRrBody = {
  rrDate?: string;
  /** 狀態動作：INSPECTING 送驗收 / POSTED 過帳 / REJECTED 駁回（狀態機在後端） */
  status?: string;
  taxRate?: number;
  remark?: string | null;
  deliveryOrderNo?: string | null;
};

export async function updateRr(id: string, body: UpdateRrBody): Promise<Rr> {
  const res = await apiFetch(`/nx02/rr/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_rr_update_002');
  return (await res.json()) as Rr;
}

/** 作廢（softDelete；後端擋已過帳） */
export async function voidRr(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/rr/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx02_rr_void_002');
}

export async function addRrItem(rrId: string, body: CreateRrItemBody): Promise<unknown> {
  const res = await apiFetch(`/nx02/rr/${encodeURIComponent(rrId)}/items`, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_rr_add_item_002');
  return res.json();
}

export type PatchRrItemBody = {
  qty?: number;
  unitPriceSnapshot?: number;
  expectedQty?: number;
  actualQty?: number | null;
  defectQty?: number;
  defectType?: 'D' | 'F' | 'W' | 'O' | null;
  defectDesc?: string | null;
  batchNo?: string | null;
  warrantyExpiredAt?: string | null;
  remark?: string | null;
};

export async function patchRrItem(rrId: string, itemId: string, body: PatchRrItemBody): Promise<unknown> {
  const res = await apiFetch(`/nx02/rr/${encodeURIComponent(rrId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_rr_patch_item_002');
  return res.json();
}

export async function removeRrItem(rrId: string, itemId: string): Promise<void> {
  const res = await apiFetch(`/nx02/rr/${encodeURIComponent(rrId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_nx02_rr_remove_item_002');
}
