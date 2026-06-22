import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type UserWarehouseDto = {
  id: string;
  userId: string;
  warehouseId: string;
  /** 員工主要倉庫旗標（2026-06-22 加、範式同 user-role.isPrimary） */
  isPrimary: boolean;
  isActive: boolean;
  assignedAt: string;
  assignedBy: string | null;
  assignedByName: string | null;
  revokedAt: string | null;
  userDisplayName: string | null;
  /** 帳號（列表顯示；避免僅有 userId 內碼） */
  userAccount: string | null;
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
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    userId: params.userId,
    warehouseId: params.warehouseId,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
  });
  const res = await apiFetch(`/user-warehouse${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_user_warehouse_list');
  return res.json() as Promise<PagedResult<UserWarehouseDto>>;
}

export async function assignUserWarehouse(body: {
  userId: string;
  warehouseId: string;
  isPrimary?: boolean;
}): Promise<UserWarehouseDto> {
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

export async function setUserWarehousePrimary(id: string, isPrimary: boolean): Promise<UserWarehouseDto> {
  const res = await apiFetch(`/user-warehouse/${encodeURIComponent(id)}/set-primary`, {
    method: 'PATCH',
    body: JSON.stringify({ isPrimary }),
  });
  await assertOk(res, 'nxui_base_user_warehouse_set_primary');
  return res.json() as Promise<UserWarehouseDto>;
}
