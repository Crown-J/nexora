// apps/nx-ui/src/features/nx01/engine/api/engine.ts
// 對應後端：apps/nx-api/src/nx01/engine/engine.controller.ts
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type {
  CreateEngineBody,
  EngineDto,
  ListEngineParams,
  PagedEngine,
  UpdateEngineBody,
} from '@data/types/nx01/engine';

const BASE = '/nx01/engines';

export async function listEngine(params: ListEngineParams): Promise<PagedEngine> {
  const query = buildQueryString({
    page: params.page !== undefined ? String(params.page) : undefined,
    pageSize: params.pageSize !== undefined ? String(params.pageSize) : undefined,
    search: params.search?.trim() ? params.search.trim() : undefined,
    fuelType: params.fuelType !== undefined ? String(params.fuelType) : undefined,
    aspirationType:
      params.aspirationType !== undefined ? String(params.aspirationType) : undefined,
    carBrandId: params.carBrandId?.trim() ? params.carBrandId.trim() : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_engine_list');
  return (await res.json()) as PagedEngine;
}

export async function createEngine(body: CreateEngineBody): Promise<EngineDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_engine_create');
  return (await res.json()) as EngineDto;
}

export async function updateEngine(id: string, body: UpdateEngineBody): Promise<EngineDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_engine_update');
  return (await res.json()) as EngineDto;
}

export async function softDeleteEngine(id: string): Promise<EngineDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_engine_delete');
  return (await res.json()) as EngineDto;
}
