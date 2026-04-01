import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { CarBrandDto, CreateCarBrandBody, PagedResult, UpdateCarBrandBody } from '../types';

const BASE = '/car-brand';

export async function listCarBrand(params: { page: number; pageSize: number; q?: string }): Promise<PagedResult<CarBrandDto>> {
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(params.pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });
    const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_car_brand_list');
    return (await res.json()) as PagedResult<CarBrandDto>;
}

export async function createCarBrand(body: CreateCarBrandBody): Promise<CarBrandDto> {
    const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
    await assertOk(res, 'nxui_car_brand_create');
    return (await res.json()) as CarBrandDto;
}

export async function updateCarBrand(id: string, body: UpdateCarBrandBody): Promise<CarBrandDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
    await assertOk(res, 'nxui_car_brand_update');
    return (await res.json()) as CarBrandDto;
}
