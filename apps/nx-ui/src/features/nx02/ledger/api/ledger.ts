/**
 * File: apps/nx-ui/src/features/nx02/ledger/api/ledger.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-LED-UI-API-001：庫存台帳列表
 */

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';
import { buildQueryString } from '@/shared/api/query';

import type { LedgerListResponse } from '../types';

export type ListLedgerParams = {
  q?: string;
  warehouseId?: string;
  movementType?: string;
  sourceDocType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

/**
 * @FUNCTION_CODE NX02-LED-UI-API-001-F01
 */
export async function listLedger(params: ListLedgerParams): Promise<LedgerListResponse> {
  const qs = buildQueryString({
    q: params.q?.trim() || undefined,
    warehouseId: params.warehouseId || undefined,
    movementType: params.movementType || undefined,
    sourceDocType: params.sourceDocType || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  const res = await apiFetch(`/nx02/ledger${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_ledger_list_001');
  return (await res.json()) as LedgerListResponse;
}
