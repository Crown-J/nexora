// apps/nx-ui/src/features/shared/master/car-brand/api/car-brand.ts
// 對應後端：apps/nx-api/src/nx01/car-brand/car-brand.controller.ts
// Crown 拍 Q2=A：NX00-CLEANUP 已清、route 改新範式 /nx01/car-brands、PUT → PATCH
// （shared/master 已遷、A059 後續軌統一遷移到 features/shared/master/car-brand）
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { BrandDto, CreateBrandBody, PagedResult, UpdateBrandBody } from '@data/types/shared/master/brand';

const BASE = '/nx01/car-brands';

export type ListCarBrandParams = {
  page: number;
  pageSize: number;
  q?: string;
  isActive?: boolean;
};

export async function listCarBrand(params: ListCarBrandParams): Promise<PagedResult<BrandDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const query = buildQueryString({
    page: String(params.page),
    pageSize: String(pageSize),
    search: params.q?.trim() ? params.q.trim() : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_car_brand_list');
  const j = (await res.json()) as { page: number; pageSize: number; total: number; rows: BrandDto[] };
  // 後端回傳 { page, pageSize, total, rows }，前端共用 PagedResult { items, ... }
  return { items: j.rows, page: j.page, pageSize: j.pageSize, total: j.total };
}

export async function createCarBrand(body: CreateBrandBody): Promise<BrandDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_car_brand_create');
  return (await res.json()) as BrandDto;
}

export async function updateCarBrand(id: string, body: UpdateBrandBody): Promise<BrandDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_car_brand_update');
  return (await res.json()) as BrandDto;
}

export async function setCarBrandActive(id: string, isActive: boolean): Promise<BrandDto> {
  // 後端範式：PATCH /:id body { isActive } 統一更新（無獨立 /active endpoint）
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_nx01_car_brand_set_active');
  return (await res.json()) as BrandDto;
}
