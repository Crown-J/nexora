/**
 * File: apps/nx-ui/src/features/nx02/stock-take/api/stock-take.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-UI-API-001
 */

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';
import { buildQueryString } from '@/shared/api/query';

import type { StockTakeDetailDto, StockTakeListResponse } from '../types';

/**
 * @FUNCTION_CODE NX02-STTK-UI-API-001-F01
 */
export async function listStockTake(params: {
  warehouseId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<StockTakeListResponse> {
  const qs = buildQueryString({
    warehouseId: params.warehouseId,
    status: params.status,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  const res = await apiFetch(`/nx02/stock-take${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_sttk_list_001');
  return (await res.json()) as StockTakeListResponse;
}

/**
 * @FUNCTION_CODE NX02-STTK-UI-API-001-F02
 */
export async function getStockTake(id: string): Promise<StockTakeDetailDto> {
  const res = await apiFetch(`/nx02/stock-take/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_sttk_get_001');
  return (await res.json()) as StockTakeDetailDto;
}

/**
 * @FUNCTION_CODE NX02-STTK-UI-API-001-F03
 */
export async function createStockTake(body: {
  warehouseId: string;
  stockTakeDate: string;
  scopeType: 'F' | 'P';
  remark?: string | null;
  partIds?: string[];
}): Promise<StockTakeDetailDto> {
  const res = await apiFetch('/nx02/stock-take', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_sttk_create_001');
  return (await res.json()) as StockTakeDetailDto;
}

/**
 * @FUNCTION_CODE NX02-STTK-UI-API-001-F04
 */
export async function patchStockTakeItems(
  id: string,
  body: {
    items: { id: string; countedQty?: number | null; remark?: string | null }[];
  },
): Promise<StockTakeDetailDto> {
  const res = await apiFetch(`/nx02/stock-take/${encodeURIComponent(id)}/items`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_sttk_items_001');
  return (await res.json()) as StockTakeDetailDto;
}

/**
 * @FUNCTION_CODE NX02-STTK-UI-API-001-F05
 */
export async function postStockTake(id: string): Promise<StockTakeDetailDto> {
  const res = await apiFetch(`/nx02/stock-take/${encodeURIComponent(id)}/post`, { method: 'POST' });
  await assertOk(res, 'nxui_nx02_sttk_post_001');
  return (await res.json()) as StockTakeDetailDto;
}

/**
 * @FUNCTION_CODE NX02-STTK-UI-API-001-F06
 */
export async function voidStockTake(id: string): Promise<StockTakeDetailDto> {
  const res = await apiFetch(`/nx02/stock-take/${encodeURIComponent(id)}/void`, { method: 'POST' });
  await assertOk(res, 'nxui_nx02_sttk_void_001');
  return (await res.json()) as StockTakeDetailDto;
}

/**
 * @FUNCTION_CODE NX02-STTK-UI-API-001-F07
 */
export async function downloadStockTakeCsv(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/stock-take/${encodeURIComponent(id)}/export`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_sttk_export_001');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock-take-${id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
