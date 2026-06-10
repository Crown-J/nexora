/**
 * File: apps/nx-ui/src/features/nx02/transfer/api/transfer.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-XFER-UI-API-001：調撥單 REST
 */

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';
import { buildQueryString } from '@/shared/api/query';

import type { TransferDetailDto, TransferListResponse } from '../types';

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
