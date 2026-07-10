// apps/nx-ui/src/data/endpoints/nx02/rfq/api/rfq.ts
// NX02-RFQ-SHELL：詢價單 API client（單據外殼用、對齊 po/rr client 範式：search/items）
//   取代舊 data/endpoints/nx02/api/rfq.ts（q/rows 錯位 + patchRfqReply 死路徑、隨舊視圖退場）
//   回覆編輯改走「逐行 PATCH item」（活的端點、支援 unitPrice/leadTimeDays/status）

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type { Rfq } from '@data/types/nx02/rfq';

export type ListRfqParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export async function listRfq(params: ListRfqParams): Promise<{ items: Rfq[]; total: number }> {
  const q = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx02/rfq${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_rfq_list_002');
  const body = (await res.json()) as { items: Rfq[]; total: number };
  return { items: body.items ?? [], total: body.total ?? 0 };
}

export async function getRfq(id: string): Promise<Rfq> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_rfq_get_002');
  return (await res.json()) as Rfq;
}

export type CreateRfqItemBody = {
  partId: string;
  qty: number;
  unitPrice?: number;
  leadTimeDays?: number;
  remark?: string;
};

export type CreateRfqBody = {
  warehouseId: string;
  rfqDate?: string;
  supplierId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  remark?: string | null;
  items: CreateRfqItemBody[];
};

export async function createRfq(body: CreateRfqBody): Promise<Rfq> {
  const res = await apiFetch('/nx02/rfq', { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_rfq_create_002');
  return (await res.json()) as Rfq;
}

export type UpdateRfqBody = {
  rfqDate?: string;
  supplierId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  remark?: string | null;
  /** 狀態動作：SENT 發出 / REPLIED / CLOSED 結案（狀態機在後端） */
  status?: string;
};

export async function updateRfq(id: string, body: UpdateRfqBody): Promise<Rfq> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_rfq_update_002');
  return (await res.json()) as Rfq;
}

/** 作廢（backend 既有 POST /:id/cancel） */
export async function voidRfq(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  await assertOk(res, 'nxui_nx02_rfq_void_002');
}

export async function addRfqItem(rfqId: string, body: CreateRfqItemBody): Promise<unknown> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(rfqId)}/items`, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_rfq_add_item_002');
  return res.json();
}

export type PatchRfqItemBody = {
  qty?: number;
  unitPrice?: number | null;
  leadTimeDays?: number | null;
  /** 明細狀態：R 已回覆 / C 不採用（回覆編輯用） */
  status?: string;
  remark?: string | null;
};

export async function patchRfqItem(rfqId: string, itemId: string, body: PatchRfqItemBody): Promise<unknown> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(rfqId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_rfq_patch_item_002');
  return res.json();
}

export async function removeRfqItem(rfqId: string, itemId: string): Promise<void> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(rfqId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_nx02_rfq_remove_item_002');
}
