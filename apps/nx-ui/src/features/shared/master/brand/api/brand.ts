/**
 * Part brand（零件廠牌）API
 * W6-切換軌 2026-06-06：BASE 改 `/nx01/brands`、list/默認 isPart=true 過濾
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { BrandDto, CreateBrandBody, PagedResult, UpdateBrandBody } from '@data/types/shared/master/brand';

const BASE = '/nx01/brands';

function normalizePaged<T>(raw: unknown): PagedResult<T> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as T[];
  return {
    items,
    page: Number(j.page ?? 1),
    pageSize: Number(j.pageSize ?? 20),
    total: Number(j.total ?? 0),
  };
}

export type ListBrandParams = {
  page: number;
  pageSize: number;
  q?: string;
  isActive?: boolean;
};

export async function listBrand(params: ListBrandParams): Promise<PagedResult<BrandDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  // W6-切換軌：part 廠牌語意 → isPart=true 過濾
  const query = buildQueryString({
    page: String(params.page),
    pageSize: String(pageSize),
    search: params.q?.trim() ? params.q.trim() : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    isPart: 'true',
  });

  const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_master_brand_list_001');
  return normalizePaged<BrandDto>(await res.json());
}

export async function getBrand(id: string): Promise<BrandDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_master_brand_get_001');
  return (await res.json()) as BrandDto;
}

export async function createBrand(body: CreateBrandBody): Promise<BrandDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_master_brand_create_001');
  return (await res.json()) as BrandDto;
}

export async function updateBrand(id: string, body: UpdateBrandBody): Promise<BrandDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_master_brand_update_001');
  return (await res.json()) as BrandDto;
}

export async function setBrandActive(id: string, isActive: boolean): Promise<BrandDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

  await assertOk(res, 'nxui_master_brand_set_active_001');
  return (await res.json()) as BrandDto;
}
