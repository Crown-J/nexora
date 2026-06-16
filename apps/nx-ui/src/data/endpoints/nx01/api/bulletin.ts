import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type BulletinDto = {
  id: string;
  title: string;
  content: string | null;
  type: string;
  isPinned: boolean;
  expiredAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const BASE = '/nx01/bulletins';

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

export async function listBulletins(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}): Promise<PagedResult<BulletinDto>> {
  const pageSize = clampNx01ListPageSize(params?.pageSize, 20);
  const qs = buildQueryString({
    page: params?.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    search: params?.search?.trim() || undefined,
    isActive: params?.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_bulletin_list');
  return normalizePaged<BulletinDto>(await res.json());
}
