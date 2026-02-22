/**
 * File: apps/nx-ui/src/features/nx00/rbac/api/rbac.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-RBAC-API-001：RBAC API Client（roles / members / search）
 *
 * Notes:
 * - 使用 features/auth/apiFetch（自動帶 token / 處理 base url）
 */

import { apiFetch } from '@/features/auth/apiFetch';
import type { RoleListItem, RoleMembersDto, UserLite } from '@/features/nx00/rbac/types';

export type CreateRoleInput = {
  code: string;
  name: string;
  desc?: string | null;
  isActive?: boolean;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-RBAC-API-001-F01
 * 說明：
 * - 列出角色清單
 * - GET /nx00/rbac/roles
 */
export async function listRoles(): Promise<RoleListItem[]> {
  const res = await apiFetch('/nx00/rbac/roles', { method: 'GET' });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`listRoles failed: ${res.status} ${t}`);
  }

  return (await res.json()) as RoleListItem[];
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-RBAC-API-001-F06
 * 說明：
 * - 建立角色
 * - POST /nx00/rbac/roles
 *
 * Notes:
 * - UI 使用 desc，但後端多半是 description（Nx00Role.description）
 * - 因此 payload 用 description 傳，保持 DB/DTO 一致
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`createRole failed: ${res.status} ${t}`);
  }

  return (await res.json()) as RoleListItem;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-RBAC-API-001-F02
 * 說明：
 * - 取得 role members
 * - GET /nx00/rbac/roles/:roleId/members
 */
export async function getRoleMembers(roleId: string): Promise<RoleMembersDto> {
  const res = await apiFetch(`/nx00/rbac/roles/${roleId}/members`, { method: 'GET' });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`getRoleMembers failed: ${res.status} ${t}`);
  }

  return (await res.json()) as RoleMembersDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-RBAC-API-001-F03
 * 說明：
 * - 搜尋 users（候選人）
 * - GET /nx00/rbac/users/search?q=...
 */
export async function searchUsers(q: string): Promise<UserLite[]> {
  const qs = new URLSearchParams();
  if (q.trim()) qs.set('q', q.trim());

  const res = await apiFetch(`/nx00/rbac/users/search?${qs.toString()}`, { method: 'GET' });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`searchUsers failed: ${res.status} ${t}`);
  }

  return (await res.json()) as UserLite[];
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-RBAC-API-001-F04
 * 說明：
 * - 新增 role member
 * - POST /nx00/rbac/roles/:roleId/members  body: { userId }
 */
export async function addRoleMember(roleId: string, userId: string): Promise<void> {
  const res = await apiFetch(`/nx00/rbac/roles/${roleId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`addRoleMember failed: ${res.status} ${t}`);
  }
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-RBAC-API-001-F05
 * 說明：
 * - 移除 role member
 * - DELETE /nx00/rbac/roles/:roleId/members/:userId
 */
export async function removeRoleMember(roleId: string, userId: string): Promise<void> {
  const res = await apiFetch(`/nx00/rbac/roles/${roleId}/members/${userId}`, { method: 'DELETE' });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`removeRoleMember failed: ${res.status} ${t}`);
  }
}