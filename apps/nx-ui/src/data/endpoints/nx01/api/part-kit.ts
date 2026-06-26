// apps/nx-ui/src/data/endpoints/nx01/api/part-kit.ts
// 2026-06-26：組合/拆解組件關係 API client（表頭 + 組件明細含數量）
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type PartKitItemDto = {
  id?: string;
  partId: string;
  qty: string;
  sortNo?: number;
  remark?: string | null;
  partCode?: string | null;
  partName?: string | null;
};

export type PartKitDto = {
  id: string;
  wholePartId: string;
  wholePartCode: string | null;
  wholePartName: string | null;
  name: string;
  remark: string | null;
  sortNo: number;
  isActive: boolean;
  items: PartKitItemDto[];
  createdAt: string;
  updatedAt: string;
};

export type PartKitItemInput = { partId: string; qty: number; sortNo?: number; remark?: string | null };

export type PartKitWriteBody = {
  wholePartId?: string;
  name?: string;
  remark?: string | null;
  items?: PartKitItemInput[];
  sortNo?: number;
  isActive?: boolean;
};

const BASE = '/nx01/part-kits';

function normalizePaged<T>(raw: unknown): PagedResult<T> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as T[];
  return { items, page: Number(j.page ?? 1), pageSize: Number(j.pageSize ?? 20), total: Number(j.total ?? 0) };
}

export async function listPartKits(params: {
  q?: string;
  wholePartId?: string;
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}): Promise<PagedResult<PartKitDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    wholePartId: params.wholePartId?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_part_kit_list');
  return normalizePaged<PartKitDto>(await res.json());
}

export async function getPartKit(id: string): Promise<PartKitDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_part_kit_get');
  return res.json() as Promise<PartKitDto>;
}

export async function createPartKit(body: PartKitWriteBody): Promise<PartKitDto> {
  const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_base_part_kit_create');
  return res.json() as Promise<PartKitDto>;
}

export async function updatePartKit(id: string, body: PartKitWriteBody): Promise<PartKitDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_base_part_kit_update');
  return res.json() as Promise<PartKitDto>;
}

export async function setPartKitActive(id: string, isActive: boolean): Promise<void> {
  if (isActive) {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) });
    await assertOk(res, 'nxui_base_part_kit_activate');
    return;
  }
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_base_part_kit_deactivate');
}
