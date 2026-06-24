/**
 * File: apps/nx-ui/src/features/shared/master/location/api/location.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOCATION-API-001：Location API Client（list/get/create/update/setActive）
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { CreateLocationBody, LocationDto, PagedResult, UpdateLocationBody } from '@data/types/shared/master/location';

// 2026-06-24 修 404：後端 controller 路徑為 'nx01/locations'（apps/nx-api/src/nx01/location/location.controller.ts:20）
const BASE = '/nx01/locations';

export type ListLocationParams = {
    page: number;
    pageSize: number;
    q?: string;
    warehouseId?: string; // LITE 會固定傳入單倉 id；PLUS 才開放使用者選倉
    isActive?: boolean;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOCATION-API-001-F01
 * 說明：
 * - listLocation：列出庫位清單（分頁）
 * - GET /location?page=&pageSize=&q=&warehouseId=
 */
export async function listLocation(params: ListLocationParams): Promise<PagedResult<LocationDto>> {
    const pageSize = clampNx01ListPageSize(params.pageSize, 20);
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
        warehouseId: params.warehouseId ? String(params.warehouseId) : undefined,
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
    });

    const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_master_location_list_001');
    // 2026-06-24 修：後端 location.service 回 { rows } 不是 { items }、轉換
    const j = (await res.json()) as { items?: LocationDto[]; rows?: LocationDto[]; page?: number; pageSize?: number; total?: number };
    return {
        items: (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as LocationDto[],
        page: Number(j.page ?? 1),
        pageSize: Number(j.pageSize ?? pageSize),
        total: Number(j.total ?? 0),
    };
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOCATION-API-001-F02
 * 說明：
 * - getLocation：取得單筆庫位
 * - GET /location/:id
 */
export async function getLocation(id: string): Promise<LocationDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_master_location_get_001');
    return (await res.json()) as LocationDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOCATION-API-001-F03
 * 說明：
 * - createLocation：建立庫位
 * - POST /location
 */
export async function createLocation(body: CreateLocationBody): Promise<LocationDto> {
    const res = await apiFetch(BASE, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_master_location_create_001');
    return (await res.json()) as LocationDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOCATION-API-001-F04
 * 說明：
 * - updateLocation：更新庫位
 * - PATCH /nx01/locations/:id（2026-06-24 修：後端是 @Patch、原前端用 PUT 是 mismatch）
 */
export async function updateLocation(id: string, body: UpdateLocationBody): Promise<LocationDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_master_location_update_001');
    return (await res.json()) as LocationDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOCATION-API-001-F05
 * 說明：
 * - setLocationActive：切換啟用狀態
 * - PATCH /location/:id/active
 */
export async function setLocationActive(id: string, isActive: boolean): Promise<LocationDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
    });

    await assertOk(res, 'nxui_master_location_set_active_001');
    return (await res.json()) as LocationDto;
}