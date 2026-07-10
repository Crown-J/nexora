// apps/nx-ui/src/data/endpoints/nx02/pr/api/pr.ts
// NX02-PR-SHELL：進貨退回 API client（單據外殼用、對齊 po/rr client 範式：search/items）
//   取代舊 data/endpoints/nx02/api/pr.ts（隨舊視圖退場）

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type { Pr } from '@data/types/nx02/pr';

export type ListPrParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export async function listPr(params: ListPrParams): Promise<{ items: Pr[]; total: number }> {
  const q = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx02/purchase-return${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_pr_list_002');
  const body = (await res.json()) as { items: Pr[]; total: number };
  return { items: body.items ?? [], total: body.total ?? 0 };
}

export async function getPr(id: string): Promise<Pr> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_pr_get_002');
  return (await res.json()) as Pr;
}

export type CreatePrItemBody = {
  /** 來源進貨明細（必填：退貨行必回鏈進貨行） */
  rrItemId: string;
  partId: string;
  qty: number;
  /** 退貨成本快照（寫入 unit_cost） */
  unitPriceSnapshot: number;
  locationId?: string;
  returnReason?: string;
  remark?: string;
};

export type CreatePrBody = {
  prDate: string;
  warehouseId: string;
  supplierId: string;
  rrId?: string;
  currencyId?: string;
  taxRate?: number;
  remark?: string;
  returnMode?: 'F' | 'P' | 'A';
  dispositionFlag?: 'G' | 'B' | 'W';
  items: CreatePrItemBody[];
};

export async function createPr(body: CreatePrBody): Promise<Pr> {
  const res = await apiFetch('/nx02/purchase-return', { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_pr_create_002');
  return (await res.json()) as Pr;
}

export type UpdatePrBody = {
  prDate?: string;
  /** 狀態動作：POSTED 過帳（F/P 扣庫存+立應收；A 折讓沖應付；W 自動建保固單） */
  status?: string;
  taxRate?: number;
  remark?: string | null;
  returnMode?: 'F' | 'P' | 'A';
  dispositionFlag?: 'G' | 'B' | 'W';
};

export async function updatePr(id: string, body: UpdatePrBody): Promise<Pr> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_pr_update_002');
  return (await res.json()) as Pr;
}

/** 作廢（softDelete） */
export async function voidPr(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx02_pr_void_002');
}

export async function addPrItem(prId: string, body: CreatePrItemBody): Promise<unknown> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(prId)}/items`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_pr_add_item_002');
  return res.json();
}

export type PatchPrItemBody = {
  qty?: number;
  unitPriceSnapshot?: number;
  locationId?: string | null;
  remark?: string | null;
};

export async function patchPrItem(prId: string, itemId: string, body: PatchPrItemBody): Promise<unknown> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(prId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_pr_patch_item_002');
  return res.json();
}

export async function removePrItem(prId: string, itemId: string): Promise<void> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(prId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_nx02_pr_remove_item_002');
}
