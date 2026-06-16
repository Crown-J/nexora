// apps/nx-ui/src/features/sale/bundle/api/bundle.ts
// F2 組合套餐 2026-06-09：API client

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

import type {
  ApplyBundleToSoResult,
  Bundle,
  BundleListResponse,
  CreateBundleItemPayload,
  CreateBundlePayload,
  UpdateBundlePayload,
} from '@data/types/nx04/bundle';

export interface ListBundleParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export function listBundle(params: ListBundleParams = {}): Promise<BundleListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    search: params.search,
    isActive: params.isActive !== undefined ? String(params.isActive) : undefined,
  });
  return apiJson(`/nx04/bundle${qs}`);
}

export function getBundle(id: string): Promise<Bundle> {
  return apiJson(`/nx04/bundle/${encodeURIComponent(id)}`);
}

export function createBundle(payload: CreateBundlePayload): Promise<Bundle> {
  return apiJson(`/nx04/bundle`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBundle(id: string, payload: UpdateBundlePayload): Promise<Bundle> {
  return apiJson(`/nx04/bundle/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function replaceBundleItems(id: string, items: CreateBundleItemPayload[]): Promise<Bundle> {
  return apiJson(`/nx04/bundle/${encodeURIComponent(id)}/items`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}

export function voidBundle(id: string): Promise<unknown> {
  return apiJson(`/nx04/bundle/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function applyBundleToSo(
  soId: string,
  args: { bundleId: string; warehouseId: string; locationId?: string },
): Promise<ApplyBundleToSoResult> {
  return apiJson(`/nx04/so/${encodeURIComponent(soId)}/apply-bundle`, {
    method: 'POST',
    body: JSON.stringify(args),
  });
}
