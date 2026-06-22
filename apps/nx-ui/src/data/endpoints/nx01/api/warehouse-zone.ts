// apps/nx-ui/src/data/endpoints/nx01/api/warehouse-zone.ts
// 倉庫分區 API client（2026-06-22 執行長拍板新增四層架構）
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

export type WarehouseZoneRow = {
  id: string;
  tenantId: string;
  warehouseId: string;
  code: string;
  name: string;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  warehouse?: { code: string; name: string } | null;
};

export type WarehouseZoneListResult = {
  page: number;
  pageSize: number;
  total: number;
  rows: WarehouseZoneRow[];
};

export async function listWarehouseZones(params: {
  warehouseId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<WarehouseZoneListResult> {
  const qs = buildQueryString({
    warehouseId: params.warehouseId,
    search: params.search?.trim() || undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
  });
  const res = await apiFetch(`/nx01/warehouse-zones${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_warehouse_zone_list');
  return (await res.json()) as WarehouseZoneListResult;
}

export async function createWarehouseZone(body: {
  warehouseId: string;
  code: string;
  name: string;
  sortNo?: number;
  isActive?: boolean;
}): Promise<WarehouseZoneRow> {
  const res = await apiFetch('/nx01/warehouse-zones', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_warehouse_zone_create');
  return (await res.json()) as WarehouseZoneRow;
}

export async function updateWarehouseZone(
  id: string,
  body: {
    name?: string;
    sortNo?: number;
    isActive?: boolean;
  },
): Promise<WarehouseZoneRow> {
  const res = await apiFetch(`/nx01/warehouse-zones/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_warehouse_zone_update');
  return (await res.json()) as WarehouseZoneRow;
}

export async function softDeleteWarehouseZone(id: string): Promise<WarehouseZoneRow> {
  const res = await apiFetch(`/nx01/warehouse-zones/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_warehouse_zone_delete');
  return (await res.json()) as WarehouseZoneRow;
}
