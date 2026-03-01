/**
 * File: apps/nx-ui/src/features/nx00/brand/api/brand.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-BRAND-API-001：Brand API Client（list/get/create/update/setActive）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { BrandDto, CreateBrandBody, PagedResult, UpdateBrandBody } from '@/features/nx00/brand/types';

const BASE = '/brand';

export type ListBrandParams = {
    page: number;
    pageSize: number;
    q?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-BRAND-API-001-F01
 * 說明：
 * - listBrand：列出品牌清單（分頁）
 * - GET /brand?page=&pageSize=&q=
 */
export async function listBrand(params: ListBrandParams): Promise<PagedResult<BrandDto>> {
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(params.pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_brand_list_001');
    return (await res.json()) as PagedResult<BrandDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-BRAND-API-001-F02
 * 說明：
 * - getBrand：取得單筆品牌
 * - GET /brand/:id
 */
export async function getBrand(id: string): Promise<BrandDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_brand_get_001');
    return (await res.json()) as BrandDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-BRAND-API-001-F03
 * 說明：
 * - createBrand：建立品牌
 * - POST /brand
 */
export async function createBrand(body: CreateBrandBody): Promise<BrandDto> {
    const res = await apiFetch(BASE, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_brand_create_001');
    return (await res.json()) as BrandDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-BRAND-API-001-F04
 * 說明：
 * - updateBrand：更新品牌
 * - PUT /brand/:id
 */
export async function updateBrand(id: string, body: UpdateBrandBody): Promise<BrandDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_brand_update_001');
    return (await res.json()) as BrandDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-BRAND-API-001-F05
 * 說明：
 * - setBrandActive：切換啟用狀態
 * - PATCH /brand/:id/active
 */
export async function setBrandActive(id: string, isActive: boolean): Promise<BrandDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
    });

    await assertOk(res, 'nxui_nx00_brand_set_active_001');
    return (await res.json()) as BrandDto;
}