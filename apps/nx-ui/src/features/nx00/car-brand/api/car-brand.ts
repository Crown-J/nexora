import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { BrandDto, CreateBrandBody, PagedResult, UpdateBrandBody } from '@/features/nx00/brand/types';

const BASE = '/car-brand';

export type ListCarBrandParams = {
  page: number;
  pageSize: number;
  q?: string;
  isActive?: boolean;
};

export async function listCarBrand(params: ListCarBrandParams): Promise<PagedResult<BrandDto>> {
  const query = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q?.trim() ? params.q.trim() : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_car_brand_list');
  return (await res.json()) as PagedResult<BrandDto>;
}

export async function createCarBrand(body: CreateBrandBody): Promise<BrandDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx00_car_brand_create');
  return (await res.json()) as BrandDto;
}

export async function updateCarBrand(id: string, body: UpdateBrandBody): Promise<BrandDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx00_car_brand_update');
  return (await res.json()) as BrandDto;
}

export async function setCarBrandActive(id: string, isActive: boolean): Promise<BrandDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_nx00_car_brand_set_active');
  return (await res.json()) as BrandDto;
}
