/**
 * File: apps/nx-ui/src/features/nx00/users/api/users.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-USERS-API-001：Users API Client（list/get/create/update/setActive/changePassword）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

export type UserRow = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  statusCode: string;
  remark: string | null;

  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string | null;

  // ✅ audit
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListUsersParams = {
  page: number;
  pageSize: number;
  q?: string;
};

export async function listUsers(params: ListUsersParams): Promise<PagedResult<UserRow>> {
  const query = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q?.trim() ? params.q.trim() : undefined,
  });

  const res = await apiFetch(`/users${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_users_list_001');
  return (await res.json()) as PagedResult<UserRow>;
}

export async function getUser(id: string): Promise<UserRow> {
  const res = await apiFetch(`/users/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_users_get_001');
  return (await res.json()) as UserRow;
}

export type CreateUserBody = {
  username: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
  statusCode?: string;
  remark?: string | null;

  // password 交給後端預設 changeme
  password?: string;
};

export async function createUser(body: CreateUserBody): Promise<UserRow> {
  const res = await apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_nx00_users_create_001');
  return (await res.json()) as UserRow;
}

export type UpdateUserBody = {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  statusCode?: string;
  isActive?: boolean;
  remark?: string | null;
};

export async function updateUser(id: string, body: UpdateUserBody): Promise<UserRow> {
  const res = await apiFetch(`/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_nx00_users_update_001');
  return (await res.json()) as UserRow;
}

export async function setUserActive(id: string, isActive: boolean): Promise<UserRow> {
  const res = await apiFetch(`/users/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

  await assertOk(res, 'nxui_nx00_users_set_active_001');
  return (await res.json()) as UserRow;
}

export async function changeUserPassword(id: string, password: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/users/${encodeURIComponent(id)}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });

  await assertOk(res, 'nxui_nx00_users_change_password_001');
  return res.json().catch(() => ({ ok: true }));
}