/**
 * File: apps/nx-ui/src/features/nx02/stock-setting/api/stock-setting.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STKG-UI-API-001
 */

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';
import { buildQueryString } from '@/shared/api/query';

import type { StockSettingListResponse, StockSettingRowDto } from '../types';

/**
 * @FUNCTION_CODE NX02-STKG-UI-API-001-F01
 */
export async function listStockSetting(params: {
  q?: string;
  warehouseId?: string;
  hasMinQty?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<StockSettingListResponse> {
  const qs = buildQueryString({
    q: params.q,
    warehouseId: params.warehouseId,
    hasMinQty: params.hasMinQty === true ? 'true' : undefined,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  const res = await apiFetch(`/nx02/stock-setting${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_stkg_list_001');
  return (await res.json()) as StockSettingListResponse;
}

/**
 * @FUNCTION_CODE NX02-STKG-UI-API-001-F02
 */
export async function getStockSetting(id: string): Promise<StockSettingRowDto> {
  const res = await apiFetch(`/nx02/stock-setting/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_stkg_get_001');
  return (await res.json()) as StockSettingRowDto;
}

/**
 * @FUNCTION_CODE NX02-STKG-UI-API-001-F03
 */
export async function createStockSetting(body: {
  partId: string;
  warehouseId: string;
  minQty: number;
  maxQty: number;
  isActive?: boolean;
  remark?: string | null;
}): Promise<StockSettingRowDto> {
  const res = await apiFetch('/nx02/stock-setting', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_stkg_create_001');
  return (await res.json()) as StockSettingRowDto;
}

/**
 * @FUNCTION_CODE NX02-STKG-UI-API-001-F04
 */
export async function patchStockSetting(
  id: string,
  body: { minQty?: number; maxQty?: number; remark?: string | null },
): Promise<StockSettingRowDto> {
  const res = await apiFetch(`/nx02/stock-setting/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_stkg_patch_001');
  return (await res.json()) as StockSettingRowDto;
}

/**
 * @FUNCTION_CODE NX02-STKG-UI-API-001-F05
 */
export async function setStockSettingActive(id: string, isActive: boolean): Promise<StockSettingRowDto> {
  const res = await apiFetch(`/nx02/stock-setting/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_nx02_stkg_active_001');
  return (await res.json()) as StockSettingRowDto;
}
