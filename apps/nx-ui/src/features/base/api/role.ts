import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { PagedResult } from './types';

export type RoleDto = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortNo: number;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
};

export async function listRoles(params: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<RoleDto>> {
  const qs = buildQueryString({
    q: params.q?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
  });
  const res = await apiFetch(`/role${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_role_list');
  return res.json() as Promise<PagedResult<RoleDto>>;
}

export async function createRole(body: {
  code: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  isActive?: boolean;
  sortNo?: number;
}): Promise<RoleDto> {
  const res = await apiFetch('/role', {
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
    isActive?: boolean;
    sortNo?: number;
  },
): Promise<RoleDto> {
  const res = await apiFetch(`/role/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_role_update');
  return res.json() as Promise<RoleDto>;
}
