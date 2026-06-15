// apps/nx-ui/src/features/nx01/model/api/model.ts
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type { ListModelParams, ModelBody, ModelDto, PagedModel } from '@data/types/base/model';

const BASE = '/nx01/models';

export async function listModel(params: ListModelParams): Promise<PagedModel> {
  const q = buildQueryString({
    page: params.page !== undefined ? String(params.page) : undefined,
    pageSize: params.pageSize !== undefined ? String(params.pageSize) : undefined,
    search: params.search?.trim() ? params.search.trim() : undefined,
    carBrandId: params.carBrandId?.trim() ? params.carBrandId.trim() : undefined,
    modelYearFrom:
      params.modelYearFrom !== undefined ? String(params.modelYearFrom) : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_model_list');
  return (await res.json()) as PagedModel;
}

export async function createModel(body: ModelBody): Promise<ModelDto> {
  const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_model_create');
  return (await res.json()) as ModelDto;
}

export async function updateModel(id: string, body: ModelBody): Promise<ModelDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_model_update');
  return (await res.json()) as ModelDto;
}

export async function softDeleteModel(id: string): Promise<ModelDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_model_delete');
  return (await res.json()) as ModelDto;
}
