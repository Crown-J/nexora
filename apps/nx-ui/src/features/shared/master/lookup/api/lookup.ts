/**
 * File: apps/nx-ui/src/features/shared/master/lookup/api/lookup.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOOKUPS-API-001：Lookup APIs（brand／warehouse／location／part 等）
 *
 * Notes:
 * - 回傳建議為 array：LookupRow[] / PartStatusRow[]
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import type { LookupRow, PartStatusRow } from '@data/types/shared/master/lookup';

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

    return getJson<LookupRow[]>(`/lookup/brand${q}`, 'nxui_master_lookup_brand_list_001');
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOOKUPS-API-001-F01B
 * W6-Phase 4a 2026-06-06：car brand → 切 nx01/brands + isCar=true（單一 brand 表）
 * - 舊 /lookup/car-brand 端點本就不存在於 backend、本 hook 載入即 404，視同死碼修復
 * - 回傳結構 normalize 成 LookupRow（id/code/name/isActive）對齊舊 hook 介面、caller 不需改
 */
export async function listLookupCarBrand(params: ListLookupsParams = {}): Promise<LookupRow[]> {
    const q = buildQueryString({
        pageSize: '100',
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        search: params.q?.trim() ? params.q.trim() : undefined,
        isCar: 'true',
    });

    const raw = await getJson<{ rows?: LookupRow[]; items?: LookupRow[] }>(
      `/nx01/brands${q}`,
      'nxui_master_lookup_car_brand_list_001',
    );
    return raw.rows ?? raw.items ?? [];
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOOKUPS-API-001-F01C
 * 說明：倉庫下拉（NX02 庫存一覽／台帳等）
 * - GET /lookup/warehouse?isActive=true
 */
export async function listLookupWarehouse(params: ListLookupsParams = {}): Promise<LookupRow[]> {
    const q = buildQueryString({
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    return getJson<LookupRow[]>(`/lookup/warehouse${q}`, 'nxui_master_lookup_warehouse_list_001');
}

export type LookupLocationRow = {
    id: string;
    warehouseId: string;
    code: string;
    name: string | null;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOOKUPS-API-001-F01D
 * - GET /lookup/location?warehouseId=&isActive=true
 */
export async function listLookupLocation(params: {
    warehouseId: string;
    isActive?: boolean;
}): Promise<LookupLocationRow[]> {
    const q = buildQueryString({
        warehouseId: params.warehouseId,
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
    });
    return getJson<LookupLocationRow[]>(`/lookup/location${q}`, 'nxui_master_lookup_location_list_001');
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOOKUPS-API-001-F01E
 * 說明：零件關鍵字（料號／品名）— 對應 GET /lookup/part（文件常寫為 /lookup/part）
 */
export async function listLookupPart(params: {
    q: string;
    pageSize?: number;
    isActive?: boolean;
}): Promise<LookupRow[]> {
    const trimmed = params.q?.trim() ?? '';
    if (!trimmed) return [];
    const q = buildQueryString({
        q: trimmed,
        pageSize: String(params.pageSize ?? 20),
        isActive: params.isActive === undefined ? 'true' : String(params.isActive),
    });
    return getJson<LookupRow[]>(`/lookup/part${q}`, 'nxui_master_lookup_part_list_001');
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

    return getJson<LookupRow[]>(`/lookup/function-group${q}`, 'nxui_master_lookup_function_group_list_001');
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

    return getJson<PartStatusRow[]>(`/lookup/part-status${q}`, 'nxui_master_lookup_part_status_list_001');
}