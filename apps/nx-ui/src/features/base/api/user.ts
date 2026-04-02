import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { PagedResult } from './types';

export type UserDto = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  jobTitle: string | null;
  warehouseSummary: string | null;
  /** 舊版 API 相容（已改為多據點 summary 後可能仍短暫存在） */
  warehouseCode?: string | null;
  warehouseName?: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByUsername: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
  updatedByName: string | null;
};

export async function listUsers(params: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<UserDto>> {
  const qs = buildQueryString({
    q: params.q?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
  });
  const res = await apiFetch(`/user${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_user_list');
  return res.json() as Promise<PagedResult<UserDto>>;
}

export async function createUser(body: {
  username: string;
  password: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
}): Promise<UserDto> {
  const res = await apiFetch('/user', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_user_create');
  return res.json() as Promise<UserDto>;
}

export async function updateUser(
  id: string,
  body: {
    password?: string;
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
  },
): Promise<UserDto> {
  const res = await apiFetch(`/user/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_user_update');
  return res.json() as Promise<UserDto>;
}

export async function setUserActive(id: string, isActive: boolean): Promise<UserDto> {
  const res = await apiFetch(`/user/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_base_user_set_active');
  return res.json() as Promise<UserDto>;
}
