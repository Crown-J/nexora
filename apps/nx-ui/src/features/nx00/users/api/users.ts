/**
 * File: apps/nx-ui/src/features/nx00/users/api/users.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-API-001：Users API Client（list/get/create/update/setActive/changePassword）
 *
 * Notes:
 * - 統一使用 shared/api（apiFetch + assertOk + buildQueryString）
 * - 型別一律引用 features/nx00/users/types.ts（SSOT）
 * - 若後端路徑不是 /nx00/users，請只改 BASE 常數
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

import type {
  CreateUserBody,
  PagedResult,
  UpdateUserBody,
  UserDto,
  UsersListQuery,
} from '@/features/nx00/users/types';

const BASE = '/nx00/users'; // ✅ 若你的後端是 /users，改成 '/users' 即可

export type ListUsersParams = {
  page: number;
  pageSize: number;
  q?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-API-001-F01
 * 說明：
 * - GET /nx00/users?page=&pageSize=&q=
 */
export async function listUsers(params: ListUsersParams): Promise<PagedResult<UserDto>> {
  const query = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q?.trim() ? params.q.trim() : undefined,
  });

  const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_users_list_001');
  return (await res.json()) as PagedResult<UserDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-API-001-F02
 * 說明：
 * - GET /nx00/users/:id
 */
export async function getUser(id: string): Promise<UserDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_users_get_001');
  return (await res.json()) as UserDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-API-001-F03
 * 說明：
 * - POST /nx00/users
 */
export async function createUser(body: CreateUserBody): Promise<UserDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_nx00_users_create_001');
  return (await res.json()) as UserDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-API-001-F04
 * 說明：
 * - PUT /nx00/users/:id
 */
export async function updateUser(id: string, body: UpdateUserBody): Promise<UserDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_nx00_users_update_001');
  return (await res.json()) as UserDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-API-001-F05
 * 說明：
 * - PATCH /nx00/users/:id/active
 */
export async function setUserActive(id: string, isActive: boolean): Promise<UserDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

  await assertOk(res, 'nxui_nx00_users_set_active_001');
  return (await res.json()) as UserDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-API-001-F06
 * 說明：
 * - PATCH /nx00/users/:id/password
 * - 回傳格式不固定：優先吃 { ok: boolean }，否則 fallback { ok: true }
 */
export async function changeUserPassword(id: string, password: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });

  await assertOk(res, 'nxui_nx00_users_change_password_001');
  return res.json().catch(() => ({ ok: true }));
}