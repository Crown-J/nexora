/**
 * File: apps/nx-ui/src/features/nx02/init/api/init.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-API-001：開帳存 REST
 */

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';
import { buildQueryString } from '@/shared/api/query';

import type { InitDetailDto, InitListResponse } from '../types';

export type InitItemInput = {
  partId: string;
  locationId?: string | null;
  qty: number;
  unitCost: number;
  remark?: string | null;
};

/**
 * @FUNCTION_CODE NX02-INIT-UI-API-001-F01
 */
export async function listInit(params: {
  warehouseId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<InitListResponse> {
  const qs = buildQueryString({
    warehouseId: params.warehouseId,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  const res = await apiFetch(`/nx02/init${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_init_list_001');
  return (await res.json()) as InitListResponse;
}

/**
 * @FUNCTION_CODE NX02-INIT-UI-API-001-F02
 */
export async function getInit(id: string): Promise<InitDetailDto> {
  const res = await apiFetch(`/nx02/init/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_init_get_001');
  return (await res.json()) as InitDetailDto;
}

/**
 * @FUNCTION_CODE NX02-INIT-UI-API-001-F03
 */
export async function createInit(body: {
  warehouseId: string;
  initDate: string;
  remark?: string | null;
  items: InitItemInput[];
}): Promise<InitDetailDto> {
  const res = await apiFetch('/nx02/init', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_init_create_001');
  return (await res.json()) as InitDetailDto;
}

/**
 * @FUNCTION_CODE NX02-INIT-UI-API-001-F04
 */
export async function patchInit(
  id: string,
  body: { initDate?: string; remark?: string | null; items?: InitItemInput[] },
): Promise<InitDetailDto> {
  const res = await apiFetch(`/nx02/init/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_init_patch_001');
  return (await res.json()) as InitDetailDto;
}

/**
 * @FUNCTION_CODE NX02-INIT-UI-API-001-F05
 */
export async function postInit(id: string): Promise<InitDetailDto> {
  const res = await apiFetch(`/nx02/init/${encodeURIComponent(id)}/post`, { method: 'POST' });
  await assertOk(res, 'nxui_nx02_init_post_001');
  return (await res.json()) as InitDetailDto;
}

/**
 * @FUNCTION_CODE NX02-INIT-UI-API-001-F06
 */
export async function voidInit(id: string): Promise<InitDetailDto> {
  const res = await apiFetch(`/nx02/init/${encodeURIComponent(id)}/void`, { method: 'POST' });
  await assertOk(res, 'nxui_nx02_init_void_001');
  return (await res.json()) as InitDetailDto;
}
