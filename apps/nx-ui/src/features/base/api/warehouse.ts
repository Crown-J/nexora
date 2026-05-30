import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import { clampNx01ListPageSize } from '@/shared/lib/nx01Pagination';
import type { PagedResult } from './types';

export type WarehouseDto = {
  id: string;
  code: string;
  name: string;
  remark: string | null;
  sortNo: number;
  isActive: boolean;
  warehouseTypeId: string | null;
  // v1.2 階段 E P4：基本資料補欄
  siteId?: string | null;
  siteCode?: string | null;
  siteName?: string | null;
  isMain?: boolean;
  managerUserId?: string | null;
  managerUserAccount?: string | null;
  managerUserName?: string | null;
  warehouseTypeCode?: string | null;
  warehouseTypeName?: string | null;
  // 結構化地址
  cityId?: string | null;
  districtId?: string | null;
  streetId?: string | null;
  lane?: number | null;
  alley?: number | null;
  buildingNo?: number | null;
  buildingSubNo?: number | null;
  floor?: string | null;
  roomNo?: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByUsername?: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername?: string | null;
  updatedByName: string | null;
};

// v1.2 階段 E P4：共用 warehouse 寫入欄位
export type WarehouseWritableFields = {
  remark?: string | null;
  sortNo?: number;
  warehouseTypeId?: string | null;
  isActive?: boolean;
  siteId?: string;
  isMain?: boolean;
  managerUserId?: string | null;
  cityId?: string | null;
  districtId?: string | null;
  streetId?: string | null;
  lane?: number | null;
  alley?: number | null;
  buildingNo?: number | null;
  buildingSubNo?: number | null;
  floor?: string | null;
  roomNo?: string | null;
};

export type CreateWarehouseBody = WarehouseWritableFields & {
  code: string;
  name: string;
};

export type UpdateWarehouseBody = WarehouseWritableFields & {
  code?: string;
  name?: string;
};

const BASE = '/nx01/warehouses';

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

export async function listWarehouses(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  isActive?: boolean;
}): Promise<PagedResult<WarehouseDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    search: params.q?.trim() || undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_warehouse_list');
  return normalizePaged<WarehouseDto>(await res.json());
}

export async function createWarehouse(body: CreateWarehouseBody): Promise<WarehouseDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_warehouse_create');
  return res.json() as Promise<WarehouseDto>;
}

export async function updateWarehouse(id: string, body: UpdateWarehouseBody): Promise<WarehouseDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_warehouse_update');
  return res.json() as Promise<WarehouseDto>;
}

export async function setWarehouseActive(id: string, isActive: boolean): Promise<WarehouseDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_base_warehouse_set_active');
  return res.json() as Promise<WarehouseDto>;
}
