import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { PagedResult } from './types';

export type UserWarehouseDto = {
  id: string;
  userId: string;
  warehouseId: string;
  isActive: boolean;
  assignedAt: string;
  assignedBy: string | null;
  assignedByName: string | null;
  revokedAt: string | null;
  userDisplayName: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
};

export async function listUserWarehouses(params: {
  userId?: string;
  warehouseId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<UserWarehouseDto>> {
  const qs = buildQueryString({
    userId: params.userId,
    warehouseId: params.warehouseId,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
  });
  const res = await apiFetch(`/user-warehouse${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_user_warehouse_list');
  return res.json() as Promise<PagedResult<UserWarehouseDto>>;
}

export async function assignUserWarehouse(body: { userId: string; warehouseId: string }): Promise<UserWarehouseDto> {
  const res = await apiFetch('/user-warehouse', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_user_warehouse_assign');
  return res.json() as Promise<UserWarehouseDto>;
}

export async function revokeUserWarehouse(id: string): Promise<UserWarehouseDto> {
  const res = await apiFetch(`/user-warehouse/${encodeURIComponent(id)}/revoke`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  await assertOk(res, 'nxui_base_user_warehouse_revoke');
  return res.json() as Promise<UserWarehouseDto>;
}
