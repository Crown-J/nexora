// apps/nx-ui/src/features/inventory/disposal/api/disposal.ts
// F2 報廢 UI 2026-06-08：對應 apps/nx-api/src/nx03/disposal/

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

import type {
  CreateDisposalItemPayload,
  CreateDisposalPayload,
  Disposal,
  DisposalListResponse,
  DisposalStatus,
  UpdateDisposalPayload,
} from '@data/types/nx03/disposal';

export interface ListDisposalParams {
  page?: number;
  pageSize?: number;
  status?: DisposalStatus | string;
  warehouseId?: string;
  search?: string;
}

export function listDisposal(params: ListDisposalParams = {}): Promise<DisposalListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    status: params.status,
    warehouseId: params.warehouseId,
    search: params.search,
  });
  return apiJson(`/nx03/disposal${qs}`);
}

export function getDisposal(id: string): Promise<Disposal> {
  return apiJson(`/nx03/disposal/${encodeURIComponent(id)}`);
}

export function createDisposal(payload: CreateDisposalPayload): Promise<Disposal> {
  return apiJson(`/nx03/disposal`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDisposal(id: string, payload: UpdateDisposalPayload): Promise<Disposal> {
  return apiJson(`/nx03/disposal/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function addDisposalItem(id: string, payload: CreateDisposalItemPayload): Promise<unknown> {
  return apiJson(`/nx03/disposal/${encodeURIComponent(id)}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function removeDisposalItem(id: string, itemId: string): Promise<unknown> {
  return apiJson(
    `/nx03/disposal/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  );
}

export function voidDisposal(id: string): Promise<unknown> {
  return apiJson(`/nx03/disposal/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
