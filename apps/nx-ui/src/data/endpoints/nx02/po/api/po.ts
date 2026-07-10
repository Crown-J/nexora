// apps/nx-ui/src/data/endpoints/nx02/po/api/po.ts
// NX02-PO-SHELL：採購單 API client（單據外殼用、對齊 rr client 範式：search/items）
//   取代舊 data/endpoints/nx02/api/po.ts（q/rows 錯位、隨舊視圖退場）

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type { Po } from '@data/types/nx02/po';

export type ListPoParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  purchaseType?: string;
};

export async function listPo(params: ListPoParams): Promise<{ items: Po[]; total: number }> {
  const q = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status || undefined,
    purchaseType: params.purchaseType || undefined,
  });
  const res = await apiFetch(`/nx02/po${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_po_list_002');
  const body = (await res.json()) as { items: Po[]; total: number };
  return { items: body.items ?? [], total: body.total ?? 0 };
}

export async function getPo(id: string): Promise<Po> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_po_get_002');
  return (await res.json()) as Po;
}

export type CreatePoItemBody = {
  partId: string;
  qty: number;
  /** 採購單價（寫入 unit_cost） */
  unitPriceSnapshot: number;
  rfqItemId?: string;
  expectedDate?: string;
  remark?: string;
};

export type CreatePoBody = {
  poDate: string;
  supplierId: string;
  rfqId?: string;
  currencyId?: string;
  taxRate?: number;
  remark?: string;
  purchaseType?: 'D' | 'I' | 'B';
  /** 後端要求至少 1 行（手動建單帶首行明細；詢價路徑帶已回覆行） */
  items: CreatePoItemBody[];
};

export async function createPo(body: CreatePoBody): Promise<Po> {
  const res = await apiFetch('/nx02/po', { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_po_create_002');
  return (await res.json()) as Po;
}

export type UpdatePoBody = {
  poDate?: string;
  /** 狀態動作：PENDING_APPROVAL 送審 / APPROVED 核准 / DRAFT 退件(帶 rejectReason) /
   *  SUBMITTED 寄出 / CONFIRMED 廠商確認(觸發應付) / CLOSED 結案（狀態機在後端） */
  status?: string;
  taxRate?: number;
  remark?: string | null;
  expectedDate?: string | null;
  rejectReason?: string | null;
  // T6 里程碑 / 物流
  domesticTrackingNo?: string | null;
  paymentMilestone?: 'N' | 'D' | null;
  apMonth?: string | null;
  customsAgentPartnerId?: string | null;
  // T7 對象分開
  invoiceToPartnerId?: string | null;
  shipToPartnerId?: string | null;
  shipToAddressId?: string | null;
  deliveryAddress?: string | null;
};

export async function updatePo(id: string, body: UpdatePoBody): Promise<Po> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_po_update_002');
  return (await res.json()) as Po;
}

/** 主管退件（PENDING_APPROVAL → DRAFT、必填原因） */
export async function rejectPo(id: string, rejectReason: string): Promise<Po> {
  return updatePo(id, { status: 'DRAFT', rejectReason });
}

/** 作廢（softDelete；僅草稿可作廢） */
export async function voidPo(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx02_po_void_002');
}

export async function addPoItem(poId: string, body: CreatePoItemBody): Promise<unknown> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(poId)}/items`, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_po_add_item_002');
  return res.json();
}

export type PatchPoItemBody = {
  qty?: number;
  unitPriceSnapshot?: number;
  expectedDate?: string | null;
  remark?: string | null;
  /** 取消剩餘（CONFIRMED/PARTIAL_RECEIVED 收尾用） */
  cancelledQty?: number;
};

export async function patchPoItem(poId: string, itemId: string, body: PatchPoItemBody): Promise<unknown> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(poId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_po_patch_item_002');
  return res.json();
}

export async function removePoItem(poId: string, itemId: string): Promise<void> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(poId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_nx02_po_remove_item_002');
}

export type PoToRrBody = {
  warehouseId: string;
  items: { poItemId: string; qty: number; locationId: string }[];
};

/** 採購單轉進貨單（建草稿 RR；每行必帶入庫庫位、後端驗剩餘可收量） */
export async function poToRr(id: string, body: PoToRrBody): Promise<{ id: string }> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}/to-rr`, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_po_to_rr_002');
  return (await res.json()) as { id: string };
}
