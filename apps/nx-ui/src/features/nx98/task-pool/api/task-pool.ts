// apps/nx-ui/src/features/nx98/task-pool/api/task-pool.ts
// LITE 階段 1 M4：共享待辦池 API client

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import type { CreateTaskPoolBody, TaskPoolDto, TaskScope, TaskStatus } from '@data/types/nx98/task-pool';

const BASE = '/nx98/task-pool';

export type ListTaskPoolParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TaskStatus;
  category?: string;
  scope?: TaskScope;
  sourceModule?: string;
};

export type PagedTaskPool = {
  page: number;
  pageSize: number;
  total: number;
  rows: TaskPoolDto[];
};

export async function listTaskPool(params: ListTaskPoolParams): Promise<PagedTaskPool> {
  const qs = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status || undefined,
    category: params.category?.trim() || undefined,
    scope: params.scope || undefined,
    sourceModule: params.sourceModule?.trim() || undefined,
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx98_task_pool_list');
  return res.json() as Promise<PagedTaskPool>;
}

export async function createTaskPool(body: CreateTaskPoolBody): Promise<TaskPoolDto> {
  const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx98_task_pool_create');
  return res.json() as Promise<TaskPoolDto>;
}

export async function claimTask(id: string): Promise<TaskPoolDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/claim`, { method: 'POST', body: '{}' });
  await assertOk(res, 'nxui_nx98_task_pool_claim');
  return res.json() as Promise<TaskPoolDto>;
}

export async function releaseTask(id: string): Promise<TaskPoolDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/release`, { method: 'POST', body: '{}' });
  await assertOk(res, 'nxui_nx98_task_pool_release');
  return res.json() as Promise<TaskPoolDto>;
}

export async function assignTask(id: string, assigneeUserId: string | null): Promise<TaskPoolDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assigneeUserId }),
  });
  await assertOk(res, 'nxui_nx98_task_pool_assign');
  return res.json() as Promise<TaskPoolDto>;
}

export async function completeTask(id: string, completedRemark?: string): Promise<TaskPoolDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ completedRemark: completedRemark ?? '' }),
  });
  await assertOk(res, 'nxui_nx98_task_pool_complete');
  return res.json() as Promise<TaskPoolDto>;
}

export async function voidTask(id: string): Promise<TaskPoolDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx98_task_pool_void');
  return res.json() as Promise<TaskPoolDto>;
}
