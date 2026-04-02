import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { PagedResult } from './types';

export type WarehouseDto = {
  id: string;
  code: string;
  name: string;
  remark: string | null;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  createdByUsername?: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername?: string | null;
  updatedByName: string | null;
};

export type CreateWarehouseBody = {
  code: string;
  name: string;
  remark?: string | null;
  sortNo?: number;
  isActive?: boolean;
};

export type UpdateWarehouseBody = {
  code?: string;
  name?: string;
  remark?: string | null;
  sortNo?: number;
  isActive?: boolean;
};

export async function listWarehouses(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  isActive?: boolean;
}): Promise<PagedResult<WarehouseDto>> {
  const qs = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    q: params.q?.trim() || undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`/warehouse${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_warehouse_list');
  return res.json() as Promise<PagedResult<WarehouseDto>>;
}

export async function createWarehouse(body: CreateWarehouseBody): Promise<WarehouseDto> {
  const res = await apiFetch('/warehouse', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_warehouse_create');
  return res.json() as Promise<WarehouseDto>;
}

export async function updateWarehouse(id: string, body: UpdateWarehouseBody): Promise<WarehouseDto> {
  const res = await apiFetch(`/warehouse/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_warehouse_update');
  return res.json() as Promise<WarehouseDto>;
}

export async function setWarehouseActive(id: string, isActive: boolean): Promise<WarehouseDto> {
  const res = await apiFetch(`/warehouse/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_base_warehouse_set_active');
  return res.json() as Promise<WarehouseDto>;
}
