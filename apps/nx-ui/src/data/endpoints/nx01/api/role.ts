import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type RoleDto = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  // 02 第三批 T1 2026-06-07：職務層級 + 隸屬部門
  level?: string | null;
  departmentId?: string | null;
  departmentCode?: string | null;
  departmentName?: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortNo: number;
  createdAt: string;
  createdBy: string | null;
  createdByUsername: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
  updatedByName: string | null;
};

const BASE = '/nx01/roles';

function normalizePaged<T>(raw: unknown): PagedResult<T> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as T[];
  return {
    items,
    page: Number(j.page ?? 1),
    pageSize: Number(j.pageSize ?? 20),
    total: Number(j.total ?? 0),
  };
}

export async function getRole(id: string): Promise<RoleDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_role_get');
  return res.json() as Promise<RoleDto>;
}

export async function listRoles(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}): Promise<PagedResult<RoleDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_role_list');
  return normalizePaged<RoleDto>(await res.json());
}

export async function createRole(body: {
  code: string;
  name: string;
  description?: string | null;
  // 02 第三批 T1 2026-06-07
  level?: string | null;
  departmentId?: string | null;
  isSystem?: boolean;
  isActive?: boolean;
  sortNo?: number;
}): Promise<RoleDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_role_create');
  return res.json() as Promise<RoleDto>;
}

export async function updateRole(
  id: string,
  body: {
    code?: string;
    name?: string;
    description?: string | null;
    // 02 第三批 T1 2026-06-07
    level?: string | null;
    departmentId?: string | null;
    isActive?: boolean;
    sortNo?: number;
  },
): Promise<RoleDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_role_update');
  return res.json() as Promise<RoleDto>;
}

export async function setRoleActive(id: string, isActive: boolean): Promise<RoleDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_base_role_set_active');
  return res.json() as Promise<RoleDto>;
}
