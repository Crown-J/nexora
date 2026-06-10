/**
 * File: apps/nx-ui/src/features/nx02/auto-replenish/api/auto-replenish.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-AURE-UI-API-001：自動補貨設定 REST
 */

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

import type { AutoReplenishDetail, AutoReplenishListResponse } from '../types';

/**
 * @FUNCTION_CODE NX02-AURE-UI-API-001-F01
 */
export async function listAutoReplenish(): Promise<AutoReplenishListResponse> {
  const res = await apiFetch('/nx02/auto-replenish', { method: 'GET' });
  await assertOk(res, 'nxui_nx02_aure_list_001');
  return (await res.json()) as AutoReplenishListResponse;
}

/**
 * @FUNCTION_CODE NX02-AURE-UI-API-001-F02
 */
export async function getAutoReplenish(id: string): Promise<AutoReplenishDetail> {
  const res = await apiFetch(`/nx02/auto-replenish/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_aure_get_001');
  return (await res.json()) as AutoReplenishDetail;
}

/**
 * @FUNCTION_CODE NX02-AURE-UI-API-001-F03
 */
export async function createAutoReplenish(body: {
  fromWarehouseId: string;
  toWarehouseId: string;
  priority?: number;
  isActive?: boolean;
  remark?: string | null;
}): Promise<AutoReplenishDetail> {
  const res = await apiFetch('/nx02/auto-replenish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_aure_create_001');
  return (await res.json()) as AutoReplenishDetail;
}

/**
 * @FUNCTION_CODE NX02-AURE-UI-API-001-F04
 */
export async function patchAutoReplenish(
  id: string,
  body: {
    fromWarehouseId?: string;
    toWarehouseId?: string;
    priority?: number;
    remark?: string | null;
  },
): Promise<AutoReplenishDetail> {
  const res = await apiFetch(`/nx02/auto-replenish/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_aure_patch_001');
  return (await res.json()) as AutoReplenishDetail;
}

/**
 * @FUNCTION_CODE NX02-AURE-UI-API-001-F05
 */
export async function setAutoReplenishActive(id: string, isActive: boolean): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/nx02/auto-replenish/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_nx02_aure_active_001');
  return (await res.json()) as { ok: boolean };
}

/**
 * @FUNCTION_CODE NX02-AURE-UI-API-001-F06
 */
export async function deleteAutoReplenish(id: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/nx02/auto-replenish/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx02_aure_del_001');
  return (await res.json()) as { ok: boolean };
}
