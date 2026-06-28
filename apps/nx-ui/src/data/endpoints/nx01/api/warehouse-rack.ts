// apps/nx-ui/src/data/endpoints/nx01/api/warehouse-rack.ts
// 貨架 API client（2026-06-28 五層倉儲第四層：區域 → 貨架）
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

export type WarehouseRackRow = {
  id: string;
  tenantId: string;
  zoneId: string;
  code: string;
  name: string;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  zone?: { code: string; name: string } | null;
};

export type WarehouseRackListResult = {
  page: number;
  pageSize: number;
  total: number;
  rows: WarehouseRackRow[];
};

export async function listWarehouseRacks(params: {
  zoneId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<WarehouseRackListResult> {
  const qs = buildQueryString({
    zoneId: params.zoneId,
    search: params.search?.trim() || undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
  });
  const res = await apiFetch(`/nx01/warehouse-racks${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_warehouse_rack_list');
  return (await res.json()) as WarehouseRackListResult;
}

export async function createWarehouseRack(body: {
  zoneId: string;
  code: string;
  name: string;
  sortNo?: number;
  isActive?: boolean;
}): Promise<WarehouseRackRow> {
  const res = await apiFetch('/nx01/warehouse-racks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_warehouse_rack_create');
  return (await res.json()) as WarehouseRackRow;
}

export async function updateWarehouseRack(
  id: string,
  body: {
    name?: string;
    sortNo?: number;
    isActive?: boolean;
  },
): Promise<WarehouseRackRow> {
  const res = await apiFetch(`/nx01/warehouse-racks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_warehouse_rack_update');
  return (await res.json()) as WarehouseRackRow;
}

export async function softDeleteWarehouseRack(id: string): Promise<WarehouseRackRow> {
  const res = await apiFetch(`/nx01/warehouse-racks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_warehouse_rack_delete');
  return (await res.json()) as WarehouseRackRow;
}
