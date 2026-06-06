// apps/nx-ui/src/features/base/api/brand.ts
// W6 [3-8] 2026-06-06 品牌合併 API client（合 PartBrand + CarBrand → Brand）
//
// 雙開關 isCar / isPart：
//   - 零件 picker：listBrands({ isPart: true })
//   - 車型字典 picker：listBrands({ isCar: true })
//   - 主檔頁：listBrands() 全列

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import { clampNx01ListPageSize } from '@/shared/lib/nx01Pagination';
import type { PagedResult } from './types';

export type BrandDto = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameEn: string | null;
  countryId: string | null;
  logoUrl: string | null;
  isCar: boolean;
  isPart: boolean;
  remark: string | null;
  sortNo: number;
  isActive: boolean;
  countryCode: string | null;
  countryName: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type CreateBrandBody = {
  code: string;
  name: string;
  nameEn?: string;
  countryId?: string;
  logoUrl?: string;
  isCar?: boolean;
  isPart?: boolean;
  remark?: string;
  sortNo?: number;
  isActive?: boolean;
};

export type UpdateBrandBody = {
  name?: string;
  nameEn?: string | null;
  countryId?: string | null;
  logoUrl?: string | null;
  isCar?: boolean;
  isPart?: boolean;
  remark?: string | null;
  sortNo?: number;
  isActive?: boolean;
};

const BASE = '/nx01/brands';

function normalizePaged(raw: unknown): PagedResult<BrandDto> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as BrandDto[];
  return {
    items,
    page: Number(j.page ?? 1),
    pageSize: Number(j.pageSize ?? 20),
    total: Number(j.total ?? 0),
  };
}

export async function listBrands(params: {
  q?: string;
  isCar?: boolean;
  isPart?: boolean;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<PagedResult<BrandDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    isCar: params.isCar === undefined ? undefined : String(params.isCar),
    isPart: params.isPart === undefined ? undefined : String(params.isPart),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_brand_list');
  return normalizePaged(await res.json());
}

export async function getBrand(id: string): Promise<BrandDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_brand_get');
  return res.json() as Promise<BrandDto>;
}

export async function createBrand(body: CreateBrandBody): Promise<BrandDto> {
  const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_base_brand_create');
  return res.json() as Promise<BrandDto>;
}

export async function updateBrand(id: string, body: UpdateBrandBody): Promise<BrandDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_brand_update');
  return res.json() as Promise<BrandDto>;
}

export async function setBrandActive(id: string, isActive: boolean): Promise<BrandDto> {
  return updateBrand(id, { isActive });
}
