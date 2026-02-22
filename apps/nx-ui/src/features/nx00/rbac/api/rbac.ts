/**
 * File: apps/nx-ui/src/features/nx00/rbac/api/rbac.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-API-001：RBAC API Client（roles / members / search）
 *
 * Notes:
 * - 使用 shared/api/client（自動帶 token / baseUrl）
 * - 錯誤處理統一用 assertOk（避免各函式重複 if(!ok)）
 * - 前端 Role 描述欄位統一使用 desc（由本檔案負責 mapping description -> desc）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

import type { RoleListItem, RoleMembersDto, UserLite, CreateRoleInput } from '@/features/nx00/rbac/types';

type RoleApiRow = {
  id: string;
  code?: string;
  name: string;

  // 後端可能回 description，或已有 desc（為了相容兩者）
  description?: string | null;
  desc?: string | null;

  isActive?: boolean;
};

function mapRole(row: RoleApiRow): RoleListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    desc: row.desc ?? row.description ?? null,
    isActive: row.isActive,
  };
}

/**
 * @CODE nxui_nx00_rbac_list_roles_002
 * 說明：
 * - 列出角色清單
 * - GET /nx00/rbac/roles
 */
export async function listRoles(): Promise<RoleListItem[]> {
  const res = await apiFetch('/nx00/rbac/roles', { method: 'GET' });
  await assertOk(res, 'nxui_nx00_rbac_list_roles_002');

  const data = (await res.json()) as RoleApiRow[];
  return data.map(mapRole);
}

/**
 * @CODE nxui_nx00_rbac_create_role_002
 * 說明：
 * - 建立角色
 * - POST /nx00/rbac/roles
 *
 * Notes:
 * - UI 使用 desc，但後端多半是 description（Nx00Role.description）
 * - payload 用 description 傳，保持 DB/DTO 一致
 * - 回傳值做 mapping，讓 UI 永遠只看到 desc
 */
export async function createRole(input: CreateRoleInput): Promise<RoleListItem> {
  const payload = {
    code: input.code.trim(),
    name: input.name.trim(),
    description: input.desc?.trim() ? input.desc.trim() : null,
    isActive: input.isActive ?? true,
  };

  const res = await apiFetch('/nx00/rbac/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  await assertOk(res, 'nxui_nx00_rbac_create_role_002');

  const row = (await res.json()) as RoleApiRow;
  return mapRole(row);
}

/**
 * @CODE nxui_nx00_rbac_get_role_members_002
 * 說明：
 * - 取得 role members
 * - GET /nx00/rbac/roles/:roleId/members
 */
export async function getRoleMembers(roleId: string): Promise<RoleMembersDto> {
  const res = await apiFetch(`/nx00/rbac/roles/${roleId}/members`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_rbac_get_role_members_002');
  return (await res.json()) as RoleMembersDto;
}

/**
 * @CODE nxui_nx00_rbac_search_users_002
 * 說明：
 * - 搜尋 users（候選人）
 * - GET /nx00/rbac/users/search?q=...
 */
export async function searchUsers(q: string): Promise<UserLite[]> {
  const query = buildQueryString({ q: q.trim() ? q.trim() : undefined });

  const res = await apiFetch(`/nx00/rbac/users/search${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_rbac_search_users_002');
  return (await res.json()) as UserLite[];
}

/**
 * @CODE nxui_nx00_rbac_add_role_member_002
 * 說明：
 * - 新增 role member
 * - POST /nx00/rbac/roles/:roleId/members  body: { userId }
 */
export async function addRoleMember(roleId: string, userId: string): Promise<void> {
  const res = await apiFetch(`/nx00/rbac/roles/${roleId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });

  await assertOk(res, 'nxui_nx00_rbac_add_role_member_002');
}

/**
 * @CODE nxui_nx00_rbac_remove_role_member_002
 * 說明：
 * - 移除 role member
 * - DELETE /nx00/rbac/roles/:roleId/members/:userId
 */
export async function removeRoleMember(roleId: string, userId: string): Promise<void> {
  const res = await apiFetch(`/nx00/rbac/roles/${roleId}/members/${userId}`, {
    method: 'DELETE',
  });

  await assertOk(res, 'nxui_nx00_rbac_remove_role_member_002');
}