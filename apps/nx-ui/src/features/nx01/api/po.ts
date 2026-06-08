/**
 * File: apps/nx-ui/src/features/nx01/api/po.ts
 * Project: NEXORA (Monorepo)
 *
 * T0 路徑收斂 2026-06-07：
 * - path /nx01/po → /nx02/po（既有 nx01/po 後端不存在、是死路徑）
 * - patchPoStatus 改用 PATCH /:id { status: 全名 }（對齊 PR 範式、UpdatePoDto 已收 status）
 * - voidPo 改用 DELETE /:id（後端 softDelete 改 status=CANCELLED）
 * - poToRr 後端新增 POST /:id/to-rr wrapper（內部走 RR.create 帶 poId）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

import type { Nx01Paged, PoDetailDto, PoListRow } from '../types';

export type ListPoParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
};

export async function listPo(params: ListPoParams): Promise<Nx01Paged<PoListRow>> {
  const q = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx02/po${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_po_list_001');
  return (await res.json()) as Nx01Paged<PoListRow>;
}

export async function getPo(id: string): Promise<PoDetailDto> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_po_get_001');
  return (await res.json()) as PoDetailDto;
}

export type CreatePoBody = {
  warehouseId: string;
  poDate?: string;
  supplierId: string;
  rfqId?: string | null;
  expectedDate?: string | null;
  remark?: string | null;
  taxRate?: number;
  items: {
    partId: string;
    qty: number;
    unitCost: number;
    rfqItemId?: string | null;
    expectedDate?: string | null;
    remark?: string | null;
  }[];
};

export async function createPo(body: CreatePoBody): Promise<{ id: string }> {
  const res = await apiFetch('/nx02/po', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_po_create_001');
  return (await res.json()) as { id: string };
}

// T2-a 進貨對齊批次 2026-06-07：採購單表頭可編輯欄位（預交貨日 / 備註 / 採購日期 等）
// 限 DRAFT 草稿階段（後端 service 已守、UI 也只在 DRAFT 顯示編輯入口）
// T6 進貨對齊批次 2026-06-08：加 B 級小欄位（國內物流 / 付款里程碑 / 帳款年月 / 報關行）
// T7 進貨對齊批次 2026-06-08：加對象分開（付款 / 指送 / 收貨地址 / 直送現場）
export type PatchPoBody = {
  poDate?: string;
  expectedDate?: string | null;
  remark?: string | null;
  domesticTrackingNo?: string | null;
  paymentMilestone?: 'N' | 'D' | null;
  apMonth?: string | null;
  customsAgentPartnerId?: string | null;
  invoiceToPartnerId?: string | null;
  shipToPartnerId?: string | null;
  shipToAddressId?: string | null;
  deliveryAddress?: string | null;
};

export async function patchPo(id: string, body: PatchPoBody): Promise<void> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_po_patch_001');
}

export type PoToRrBody = {
  warehouseId: string;
  items: { poItemId: string; qty: number; locationId?: string | null }[];
};

export async function poToRr(id: string, body: PoToRrBody): Promise<{ id: string }> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}/to-rr`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_po_to_rr_001');
  return (await res.json()) as { id: string };
}

// T0：作廢用 DELETE（後端 softDelete 改 status=CANCELLED）
export async function voidPo(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx01_po_void_001');
}

/**
 * T0：狀態切換用 PATCH /:id { status: 全名 }（UpdatePoDto 已收 status）。
 * 短碼 → 全名 alias（DRAFT/APPROVED/SUBMITTED/CONFIRMED/PARTIAL_RECEIVED/RECEIVED/CLOSED/CANCELLED）。
 * 舊呼叫端傳短碼仍可用（自動展開）；UI 可直接傳全名（T1 後改）。
 */
const PO_STATUS_ALIAS: Record<string, string> = {
  D: 'DRAFT',
  A: 'APPROVED',
  S: 'SUBMITTED',
  CF: 'CONFIRMED',
  PR: 'PARTIAL_RECEIVED',
  R: 'RECEIVED',
  C: 'CLOSED',
  V: 'CANCELLED',
};
export async function patchPoStatus(id: string, status: string): Promise<void> {
  const full = PO_STATUS_ALIAS[status] ?? status;
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: full }),
  });
  await assertOk(res, 'nxui_nx01_po_status_001');
}

// 03 收尾 A 2026-06-08：採購單明細 patch（取消量、預交貨日、備註）
export type PatchPoItemBody = {
  qty?: number;
  unitPriceSnapshot?: number;
  expectedDate?: string | null;
  remark?: string | null;
  cancelledQty?: number;
};

export async function patchPoItem(poId: string, itemId: string, body: PatchPoItemBody): Promise<void> {
  const res = await apiFetch(
    `/nx02/po/${encodeURIComponent(poId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  await assertOk(res, 'nxui_nx01_po_patch_item_001');
}

// T1 2026-06-07：主管退件（status: APPROVED → DRAFT、填 rejectReason）
export async function rejectPo(id: string, rejectReason: string): Promise<void> {
  const res = await apiFetch(`/nx02/po/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'DRAFT', rejectReason }),
  });
  await assertOk(res, 'nxui_nx01_po_reject_001');
}
