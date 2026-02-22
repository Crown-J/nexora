/**
 * File: apps/nx-ui/src/features/nx00/api/lookups.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-003：Lookup APIs（brand/function-group/part-status）
 *
 * Notes:
 * - Endpoints: GET /nx00/brands, /nx00/function-groups, /nx00/part-statuses
 */

import { apiJson } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import type { LookupRow, PartStatusRow } from '../types';

export type ListLookupsParams = {
  isActive?: boolean;
};

/**
 * @CODE nxui_nx00_lookups_brands_fetch_002
 */
export async function listBrands(params: ListLookupsParams = {}): Promise<LookupRow[]> {
  const q = buildQueryString({
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });

  return apiJson<LookupRow[]>(`/nx00/brands${q}`, { method: 'GET' });
}

/**
 * @CODE nxui_nx00_lookups_function_groups_fetch_002
 */
export async function listFunctionGroups(
  params: ListLookupsParams = {}
): Promise<LookupRow[]> {
  const q = buildQueryString({
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });

  return apiJson<LookupRow[]>(`/nx00/function-groups${q}`, { method: 'GET' });
}

/**
 * @CODE nxui_nx00_lookups_part_statuses_fetch_002
 */
export async function listPartStatuses(
  params: ListLookupsParams = {}
): Promise<PartStatusRow[]> {
  const q = buildQueryString({
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });

  return apiJson<PartStatusRow[]>(`/nx00/part-statuses${q}`, { method: 'GET' });
}