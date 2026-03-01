/**
 * File: apps/nx-ui/src/features/nx00/lookups/api/lookups.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOOKUPS-API-001：Lookup APIs（brand/function-group/part-status）
 *
 * Notes:
 * - Endpoints (singular):
 *   - GET /lookup/brand
 *   - GET /lookup/function-group
 *   - GET /lookup/part-status
 *
 * - 回傳建議為 array：LookupRow[] / PartStatusRow[]
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { LookupRow, PartStatusRow } from '@/features/nx00/lookup/types';

export type ListLookupsParams = {
    isActive?: boolean;
    q?: string;
};

async function getJson<T>(url: string, code: string): Promise<T> {
    const res = await apiFetch(url, { method: 'GET' });
    await assertOk(res, code);
    return (await res.json()) as T;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOOKUPS-API-001-F01
 * 說明：
 * - listLookupBrand：品牌下拉
 * - GET /lookup/brand?isActive=true&q=
 */
export async function listLookupBrand(params: ListLookupsParams = {}): Promise<LookupRow[]> {
    const q = buildQueryString({
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    return getJson<LookupRow[]>(`/lookup/brand${q}`, 'nxui_nx00_lookup_brand_list_001');
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOOKUPS-API-001-F02
 * 說明：
 * - listLookupFunctionGroup：功能群組下拉
 * - GET /lookup/function-group?isActive=true&q=
 */
export async function listLookupFunctionGroup(params: ListLookupsParams = {}): Promise<LookupRow[]> {
    const q = buildQueryString({
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    return getJson<LookupRow[]>(`/lookup/function-group${q}`, 'nxui_nx00_lookup_function_group_list_001');
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOOKUPS-API-001-F03
 * 說明：
 * - listLookupPartStatus：零件狀態下拉
 * - GET /lookup/part-status?isActive=true&q=
 */
export async function listLookupPartStatus(params: ListLookupsParams = {}): Promise<PartStatusRow[]> {
    const q = buildQueryString({
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    return getJson<PartStatusRow[]>(`/lookup/part-status${q}`, 'nxui_nx00_lookup_part_status_list_001');
}