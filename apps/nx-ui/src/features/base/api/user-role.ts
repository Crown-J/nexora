import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { PagedResult } from './types';

export type UserRoleDto = {
  id: string;
  userId: string;
  roleId: string;
  isPrimary: boolean;
  isActive: boolean;
  assignedAt: string;
  assignedBy: string | null;
  assignedByName: string | null;
  revokedAt: string | null;
  userDisplayName: string | null;
  roleCode: string | null;
  roleName: string | null;
};

export async function listUserRoles(params: {
  userId?: string;
  roleId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<UserRoleDto>> {
  const qs = buildQueryString({
    userId: params.userId,
    roleId: params.roleId,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
  });
  const res = await apiFetch(`/user-role${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_user_role_list');
  return res.json() as Promise<PagedResult<UserRoleDto>>;
}

export async function assignUserRole(body: {
  userId: string;
  roleId: string;
  isPrimary?: boolean;
}): Promise<UserRoleDto> {
  const res = await apiFetch('/user-role', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_user_role_assign');
  return res.json() as Promise<UserRoleDto>;
}

export async function revokeUserRole(id: string): Promise<UserRoleDto> {
  const res = await apiFetch(`/user-role/${encodeURIComponent(id)}/revoke`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  await assertOk(res, 'nxui_base_user_role_revoke');
  return res.json() as Promise<UserRoleDto>;
}

export async function setUserRolePrimary(id: string, isPrimary: boolean): Promise<UserRoleDto> {
  const res = await apiFetch(`/user-role/${encodeURIComponent(id)}/primary`, {
    method: 'PATCH',
    body: JSON.stringify({ isPrimary }),
  });
  await assertOk(res, 'nxui_base_user_role_primary');
  return res.json() as Promise<UserRoleDto>;
}
