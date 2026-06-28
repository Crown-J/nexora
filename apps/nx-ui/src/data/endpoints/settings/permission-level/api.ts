// apps/nx-ui/src/data/endpoints/settings/permission-level/api.ts
// 職務↔權限拆分軌 Step5：權限等級 API client

import { apiJson } from '@data/api/client';

import type {
  CreatePermissionLevelPayload,
  LevelPermissionsResponse,
  PermissionLevel,
  UpdatePermissionLevelPayload,
} from '@data/types/settings/permission-level';

/** 列權限等級（後端回 rows） */
export function listPermissionLevels(): Promise<{
  page: number;
  pageSize: number;
  total: number;
  rows: PermissionLevel[];
}> {
  return apiJson('/nx01/permission-levels');
}

export function getPermissionLevel(id: string): Promise<PermissionLevel> {
  return apiJson(`/nx01/permission-levels/${encodeURIComponent(id)}`);
}

export function createPermissionLevel(
  payload: CreatePermissionLevelPayload,
): Promise<PermissionLevel> {
  return apiJson('/nx01/permission-levels', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePermissionLevel(
  id: string,
  payload: UpdatePermissionLevelPayload,
): Promise<PermissionLevel> {
  return apiJson(`/nx01/permission-levels/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deletePermissionLevel(id: string): Promise<PermissionLevel> {
  return apiJson(`/nx01/permission-levels/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/** 取等級的權限集合 */
export function getLevelPermissions(id: string): Promise<LevelPermissionsResponse> {
  return apiJson(`/nx01/permission-levels/${encodeURIComponent(id)}/permissions`);
}

/** 替換等級的權限集合（PUT） */
export function setLevelPermissions(
  id: string,
  permissionCodes: string[],
): Promise<{ levelId: string; added: number; removed: number; total: number }> {
  return apiJson(`/nx01/permission-levels/${encodeURIComponent(id)}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionCodes }),
  });
}
