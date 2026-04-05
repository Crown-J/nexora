/**
 * File: apps/nx-ui/src/features/nx02/shortage/api/shortage.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHOR-UI-API-001：缺貨簿 REST
 */

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';
import { buildQueryString } from '@/shared/api/query';

import type { ShortageListResponse } from '../types';

/**
 * @FUNCTION_CODE NX02-SHOR-UI-API-001-F01
 */
export async function listShortage(params: {
  q?: string;
  warehouseId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ShortageListResponse> {
  const qs = buildQueryString({
    q: params.q?.trim() || undefined,
    warehouseId: params.warehouseId || undefined,
    status: params.status || undefined,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  const res = await apiFetch(`/nx02/shortage${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_shortage_list_001');
  return (await res.json()) as ShortageListResponse;
}

/**
 * @FUNCTION_CODE NX02-SHOR-UI-API-001-F02
 */
export async function shortageToRfq(shortageIds: string[]): Promise<{ rfqId: string }> {
  const res = await apiFetch('/nx02/shortage/to-rfq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortageIds }),
  });
  await assertOk(res, 'nxui_nx02_shortage_torfq_001');
  return (await res.json()) as { rfqId: string };
}

/**
 * @FUNCTION_CODE NX02-SHOR-UI-API-001-F03
 */
export async function ignoreShortage(id: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/nx02/shortage/${encodeURIComponent(id)}/ignore`, { method: 'PATCH' });
  await assertOk(res, 'nxui_nx02_shortage_ignore_001');
  return (await res.json()) as { ok: boolean };
}
