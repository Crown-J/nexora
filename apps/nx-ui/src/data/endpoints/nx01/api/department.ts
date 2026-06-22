// apps/nx-ui/src/data/endpoints/nx01/api/department.ts
// 部門主檔 API client（2026-06-22 補：後端 /nx01/departments 已有、前端缺）
// 對齊 team.ts 結構範式
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type DepartmentDto = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  sortNo: number;
  createdAt: string;
  updatedAt: string;
};

const BASE = '/nx01/departments';

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

export async function listDepartments(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  isActive?: boolean;
} = {}): Promise<PagedResult<DepartmentDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_department_list');
  return normalizePaged<DepartmentDto>(await res.json());
}

export async function getDepartment(id: string): Promise<DepartmentDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_department_get');
  return res.json() as Promise<DepartmentDto>;
}

export async function createDepartment(body: {
  code: string;
  name: string;
  sortNo?: number;
  isActive?: boolean;
}): Promise<DepartmentDto> {
  const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_base_department_create');
  return res.json() as Promise<DepartmentDto>;
}

export async function updateDepartment(
  id: string,
  body: {
    name?: string;
    sortNo?: number;
    isActive?: boolean;
  },
): Promise<DepartmentDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_department_update');
  return res.json() as Promise<DepartmentDto>;
}

export async function softDeleteDepartment(id: string): Promise<DepartmentDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_base_department_delete');
  return res.json() as Promise<DepartmentDto>;
}
