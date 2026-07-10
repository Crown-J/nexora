/**
 * File: apps/nx-ui/src/features/nx02/transfer/api/transfer.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-XFER-UI-API-001：調撥單 REST
 */

import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';
import { buildQueryString } from '@data/api/query';

import type { TransferDetailDto, TransferListResponse } from '@data/types/nx03/transfer';

export type TransferItemInput = {
  partId: string;
  qty: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  remark?: string | null;
};

/**
 * @FUNCTION_CODE NX02-XFER-UI-API-001-F01
 */
export async function listTransfer(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  warehouseId?: string;
}): Promise<TransferListResponse> {
  const qs = buildQueryString({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
    status: params.status || undefined,
    warehouseId: params.warehouseId || undefined,
  });
  const res = await apiFetch(`/nx02/transfer${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_transfer_list_001');
  return (await res.json()) as TransferListResponse;
}

/**
 * @FUNCTION_CODE NX02-XFER-UI-API-001-F02
 */
export async function getTransfer(id: string): Promise<TransferDetailDto> {
  const res = await apiFetch(`/nx02/transfer/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_transfer_get_001');
  return (await res.json()) as TransferDetailDto;
}

/**
 * @FUNCTION_CODE NX02-XFER-UI-API-001-F03
 */
export async function createTransfer(body: {
  fromWarehouseId: string;
  toWarehouseId: string;
  stDate: string;
  remark?: string | null;
  items: TransferItemInput[];
}): Promise<TransferDetailDto> {
  const res = await apiFetch('/nx02/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_transfer_create_001');
  return (await res.json()) as TransferDetailDto;
}

/**
 * @FUNCTION_CODE NX02-XFER-UI-API-001-F04
 */
export async function patchTransfer(
  id: string,
  body: {
    stDate?: string;
    remark?: string | null;
    items?: TransferItemInput[];
  },
): Promise<TransferDetailDto> {
  const res = await apiFetch(`/nx02/transfer/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_transfer_patch_001');
  return (await res.json()) as TransferDetailDto;
}

/**
 * @FUNCTION_CODE NX02-XFER-UI-API-001-F05
 */
export async function postTransfer(id: string): Promise<TransferDetailDto> {
  const res = await apiFetch(`/nx02/transfer/${encodeURIComponent(id)}/post`, { method: 'POST' });
  await assertOk(res, 'nxui_nx02_transfer_post_001');
  return (await res.json()) as TransferDetailDto;
}

/**
 * @FUNCTION_CODE NX02-XFER-UI-API-001-F06
 */
export async function voidTransfer(id: string): Promise<TransferDetailDto> {
  const res = await apiFetch(`/nx02/transfer/${encodeURIComponent(id)}/void`, { method: 'POST' });
  await assertOk(res, 'nxui_nx02_transfer_void_001');
  return (await res.json()) as TransferDetailDto;
}

// ─────────────────────────────────────────────────────────
// NX04-QT-SHELL 2026-07-10：單據模板用 client（對齊真後端 @Controller('nx03/transfer')）
// ⚠️ 上面舊函數打 /nx02/transfer＝已不存在的路徑（無對應 controller）、留給舊視圖過渡、勿再新用。
// ─────────────────────────────────────────────────────────

import type {
  CreateStItemPayload,
  CreateStPayload,
  PatchStItemPayload,
  St,
  StItem,
  StListResponse,
  UpdateStPayload,
} from '@data/types/nx03/transfer';

const ST_BASE = '/nx03/transfer';

export async function listSt(params: { page?: number; pageSize?: number; status?: string; search?: string } = {}): Promise<StListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    status: params.status || undefined,
    search: params.search || undefined,
  });
  const res = await apiFetch(`${ST_BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx03_transfer_list');
  return (await res.json()) as StListResponse;
}

export async function getSt(id: string): Promise<St> {
  const res = await apiFetch(`${ST_BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx03_transfer_get');
  return (await res.json()) as St;
}

export async function createSt(body: CreateStPayload): Promise<St> {
  const res = await apiFetch(ST_BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx03_transfer_create');
  return (await res.json()) as St;
}

export async function updateSt(id: string, body: UpdateStPayload): Promise<St> {
  const res = await apiFetch(`${ST_BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx03_transfer_update');
  return (await res.json()) as St;
}

export async function voidSt(id: string): Promise<St> {
  const res = await apiFetch(`${ST_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx03_transfer_void');
  return (await res.json()) as St;
}

export async function addStItem(stId: string, body: CreateStItemPayload): Promise<StItem> {
  const res = await apiFetch(`${ST_BASE}/${encodeURIComponent(stId)}/items`, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx03_transfer_add_item');
  return (await res.json()) as StItem;
}

export async function patchStItem(stId: string, itemId: string, body: PatchStItemPayload): Promise<StItem> {
  const res = await apiFetch(`${ST_BASE}/${encodeURIComponent(stId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx03_transfer_patch_item');
  return (await res.json()) as StItem;
}

export async function removeStItem(stId: string, itemId: string): Promise<{ ok: true }> {
  const res = await apiFetch(`${ST_BASE}/${encodeURIComponent(stId)}/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx03_transfer_remove_item');
  return (await res.json()) as { ok: true };
}
