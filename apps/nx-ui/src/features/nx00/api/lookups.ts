/**
 * File: apps/nx-ui/src/features/nx00/api/lookups.ts
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-UI-003 Lookup APIs for filters (brand/function-group/part-status)
 * Notes:
 * - Endpoints: GET /nx00/brands, /nx00/function-groups, /nx00/part-statuses
 */

import { apiJson } from '@/features/auth/apiFetch';
import type { LookupRow, PartStatusRow } from '../types';

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/**
 * @CODE nxui_nx00_lookups_brands_fetch_001
 */
export async function listBrands(params?: { isActive?: boolean }) {
  const q = qs({ isActive: params?.isActive === undefined ? undefined : String(params.isActive) });
  return apiJson<LookupRow[]>(`/nx00/brands${q}`, { method: 'GET' });
}

/**
 * @CODE nxui_nx00_lookups_function_groups_fetch_001
 */
export async function listFunctionGroups(params?: { isActive?: boolean }) {
  const q = qs({ isActive: params?.isActive === undefined ? undefined : String(params.isActive) });
  return apiJson<LookupRow[]>(`/nx00/function-groups${q}`, { method: 'GET' });
}

/**
 * @CODE nxui_nx00_lookups_part_statuses_fetch_001
 */
export async function listPartStatuses(params?: { isActive?: boolean }) {
  const q = qs({ isActive: params?.isActive === undefined ? undefined : String(params.isActive) });
  return apiJson<PartStatusRow[]>(`/nx00/part-statuses${q}`, { method: 'GET' });
}
