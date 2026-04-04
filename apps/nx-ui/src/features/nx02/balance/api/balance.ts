/**
 * File: apps/nx-ui/src/features/nx02/balance/api/balance.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-BAL-UI-API-001：庫存餘額 / 摘要（倉庫下拉見 nx00 listLookupWarehouse）
 */

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';
import { buildQueryString } from '@/shared/api/query';

import type { BalanceListResponse, BalanceSummaryResponse } from '../types';

export type ListBalanceParams = {
  q?: string;
  warehouseId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
};

/**
 * @FUNCTION_CODE NX02-BAL-UI-API-001-F01
 */
export async function listBalance(params: ListBalanceParams): Promise<BalanceListResponse> {
  const qs = buildQueryString({
    q: params.q?.trim() || undefined,
    warehouseId: params.warehouseId || undefined,
    status: params.status && params.status !== 'all' ? params.status : undefined,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
    sortBy: params.sortBy || undefined,
    sortDir: params.sortDir || undefined,
  });
  const res = await apiFetch(`/nx02/balance${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_balance_list_001');
  return (await res.json()) as BalanceListResponse;
}

/**
 * @FUNCTION_CODE NX02-BAL-UI-API-001-F02
 */
export async function getBalanceSummary(warehouseId?: string): Promise<BalanceSummaryResponse> {
  const qs = buildQueryString({
    warehouseId: warehouseId || undefined,
  });
  const res = await apiFetch(`/nx02/balance/summary${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_balance_summary_001');
  return (await res.json()) as BalanceSummaryResponse;
}
