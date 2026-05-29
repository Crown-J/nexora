// apps/nx-ui/src/features/sale/sales-return/api/sales-return.ts
// NX04-M3 C4：SR 銷退單 API client（對應 apps/nx-api/src/nx04/sales-return/）

import { apiJson } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';

import type {
  CreateSrItemPayload,
  CreateSrPayload,
  PatchSrItemPayload,
  Sr,
  SrItem,
  SrListResponse,
  UpdateSrPayload,
} from '../types';

export interface ListSrParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export function listSr(params: ListSrParams = {}): Promise<SrListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    status: params.status,
    search: params.search,
  });
  return apiJson(`/nx04/sales-return${qs}`);
}

export function getSr(id: string): Promise<Sr> {
  return apiJson(`/nx04/sales-return/${encodeURIComponent(id)}`);
}

export function createSr(payload: CreateSrPayload): Promise<Sr> {
  return apiJson(`/nx04/sales-return`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSr(id: string, payload: UpdateSrPayload): Promise<Sr> {
  return apiJson(`/nx04/sales-return/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function voidSr(id: string, voidReason?: string): Promise<Sr> {
  const qs = buildQueryString({ voidReason });
  return apiJson(`/nx04/sales-return/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' });
}

export function addSrItem(srId: string, payload: CreateSrItemPayload): Promise<SrItem> {
  return apiJson(`/nx04/sales-return/${encodeURIComponent(srId)}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function patchSrItem(
  srId: string,
  itemId: string,
  payload: PatchSrItemPayload,
): Promise<SrItem> {
  return apiJson(
    `/nx04/sales-return/${encodeURIComponent(srId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export function removeSrItem(srId: string, itemId: string): Promise<{ ok: true }> {
  return apiJson(
    `/nx04/sales-return/${encodeURIComponent(srId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  );
}
