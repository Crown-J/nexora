/**
 * File: apps/nx-ui/src/features/nx00/location/api/location.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOCATION-API-001：Location API Client（list/get/create/update/setActive）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { CreateLocationBody, LocationDto, PagedResult, UpdateLocationBody } from '@/features/nx00/location/types';

const BASE = '/location';

export type ListLocationParams = {
    page: number;
    pageSize: number;
    q?: string;
    warehouseId?: string; // LITE 會固定傳入單倉 id；PLUS 才開放使用者選倉
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOCATION-API-001-F01
 * 說明：
 * - listLocation：列出庫位清單（分頁）
 * - GET /location?page=&pageSize=&q=&warehouseId=
 */
export async function listLocation(params: ListLocationParams): Promise<PagedResult<LocationDto>> {
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(params.pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
        warehouseId: params.warehouseId ? String(params.warehouseId) : undefined,
    });

    const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_location_list_001');
    return (await res.json()) as PagedResult<LocationDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOCATION-API-001-F02
 * 說明：
 * - getLocation：取得單筆庫位
 * - GET /location/:id
 */
export async function getLocation(id: string): Promise<LocationDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_location_get_001');
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

    await assertOk(res, 'nxui_nx00_location_create_001');
    return (await res.json()) as LocationDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-LOCATION-API-001-F04
 * 說明：
 * - updateLocation：更新庫位
 * - PUT /location/:id
 */
export async function updateLocation(id: string, body: UpdateLocationBody): Promise<LocationDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_location_update_001');
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

    await assertOk(res, 'nxui_nx00_location_set_active_001');
    return (await res.json()) as LocationDto;
}