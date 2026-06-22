// apps/nx-ui/src/data/endpoints/nx01/api/site.ts
// 據點主檔 API client（2026-06-22 新增：對齊 warehouse.ts / team.ts 範式）
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type SiteDto = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  cityId: string | null;
  districtId: string | null;
  streetId: string | null;
  phone: string | null;
  isMain: boolean;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const BASE = '/nx01/sites';

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

export async function listSites(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  isActive?: boolean;
} = {}): Promise<PagedResult<SiteDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_site_list');
  return normalizePaged<SiteDto>(await res.json());
}

export async function getSite(id: string): Promise<SiteDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_site_get');
  return res.json() as Promise<SiteDto>;
}
