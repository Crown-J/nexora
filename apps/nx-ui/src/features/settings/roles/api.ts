// apps/nx-ui/src/features/settings/roles/api.ts
// v1.2 對齊軌 A+B：角色與權限 API client

import { apiJson } from '@/shared/api/client';

import type {
  CreateRolePayload,
  PermissionCatalogItem,
  Role,
  RolePermissionsResponse,
  UpdateRolePayload,
} from './types';

/// 列出系統權限目錄
export function listPermissionCatalog(): Promise<PermissionCatalogItem[]> {
  return apiJson('/nx01/permissions/catalog');
}

/// 列出指定角色的權限 + 角色基本資料
export function getRolePermissions(roleId: string): Promise<RolePermissionsResponse> {
  return apiJson(`/nx01/permissions/role/${encodeURIComponent(roleId)}`);
}

/// 替換角色權限集合
export function setRolePermissions(
  roleId: string,
  permissionCodes: string[],
): Promise<{ roleId: string; added: number; removed: number; total: number }> {
  return apiJson(`/nx01/permissions/role/${encodeURIComponent(roleId)}`, {
    method: 'PUT',
    body: JSON.stringify({ permissionCodes }),
  });
}

/// 列角色
export function listRoles(): Promise<{ page: number; pageSize: number; total: number; items: Role[] }> {
  return apiJson('/nx01/roles');
}

export function getRole(id: string): Promise<Role> {
  return apiJson(`/nx01/roles/${encodeURIComponent(id)}`);
}

export function createRole(payload: CreateRolePayload): Promise<Role> {
  return apiJson('/nx01/roles', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateRole(id: string, payload: UpdateRolePayload): Promise<Role> {
  return apiJson(`/nx01/roles/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteRole(id: string): Promise<Role> {
  return apiJson(`/nx01/roles/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
