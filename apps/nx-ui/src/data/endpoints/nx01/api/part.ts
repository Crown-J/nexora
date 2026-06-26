// apps/nx-ui/src/features/base/api/part.ts
// 零件主檔 API client（2026-06-26：分段編碼/oldCode 已廢、加分類一二；cost/oemCodes 子表 + 搜尋 matchType）。
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type PartOemCode = {
  id?: string;
  partBrandId?: string | null;
  oemCode: string;
  remark?: string | null;
};

export type PartDto = {
  id: string;
  code: string;
  name: string;
  isOem: boolean;
  secCode: string;
  cost: string | null;
  purchaseCategory: number | null;
  techCategory: number | null;
  countryId: string | null;
  partBrandId: string | null;
  partGroupId: string | null;
  partType: number | null;
  spec: string | null;
  uom: string;
  isActive: boolean;
  warrantyMonths: number;
  priceA: string | null;
  priceB: string | null;
  priceC: string | null;
  priceD: string | null;
  createdAt: string;
  createdByName?: string | null;
  createdByUsername?: string | null;
  updatedAt: string;
  updatedByName?: string | null;
  updatedByUsername?: string | null;
  /** 顯示料號（2026-06-26 起即基準料號本身） */
  displayCode?: string;
  partBrandCode?: string | null;
  countryCode?: string | null;
  /** 搜尋時：'primary'=主料號命中 / 'oem'=替代品命中 / null */
  matchType?: 'primary' | 'oem' | null;
  /** getById 才回傳 */
  oemCodes?: PartOemCode[];
};

export type PartWriteBody = {
  code?: string;
  name?: string;
  isOem?: boolean;
  secCode?: string;
  cost?: number;
  purchaseCategory?: number | null;
  techCategory?: number | null;
  countryId?: string | null;
  partBrandId?: string | null;
  /** W6-切換軌 2026-06-06：新 brand 表 id；後端 dual-write 過渡期 */
  brandId?: string | null;
  partGroupId?: string | null;
  partType?: number;
  spec?: string | null;
  uom?: string;
  isActive?: boolean;
  warrantyMonths?: number;
  priceA?: number;
  priceB?: number;
  priceC?: number;
  priceD?: number;
  oemCodes?: PartOemCode[];
};

const BASE = '/nx01/parts';

function normalizePaged<T>(raw: unknown): PagedResult<T> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as T[];
  return { items, page: Number(j.page ?? 1), pageSize: Number(j.pageSize ?? 20), total: Number(j.total ?? 0) };
}

export async function listParts(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}): Promise<PagedResult<PartDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_part_list');
  return normalizePaged<PartDto>(await res.json());
}

export async function getPart(id: string): Promise<PartDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_part_get');
  return res.json() as Promise<PartDto>;
}

export async function createPart(body: PartWriteBody): Promise<PartDto> {
  const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_base_part_create');
  return res.json() as Promise<PartDto>;
}

export async function updatePart(id: string, body: PartWriteBody): Promise<PartDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_base_part_update');
  return res.json() as Promise<PartDto>;
}

export async function setPartActive(id: string, isActive: boolean): Promise<void> {
  if (isActive) {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) });
    await assertOk(res, 'nxui_base_part_activate');
    return;
  }
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_base_part_deactivate');
}

