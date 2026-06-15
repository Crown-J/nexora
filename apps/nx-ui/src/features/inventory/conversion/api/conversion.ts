// apps/nx-ui/src/features/inventory/conversion/api/conversion.ts
// NX03-STOCK-LITE M3-3b：重組 / 分解 API client（對應 apps/nx-api/src/nx03/conversion/）

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

import type {
  Conversion,
  ConversionListResponse,
  CreateConversionPayload,
  UpdateConversionPayload,
} from '../types';

export interface ListConversionParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export function listConversion(params: ListConversionParams = {}): Promise<ConversionListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    status: params.status,
    search: params.search,
  });
  return apiJson(`/nx03/conversion${qs}`);
}

export function getConversion(id: string): Promise<Conversion> {
  return apiJson(`/nx03/conversion/${encodeURIComponent(id)}`);
}

export function createConversion(payload: CreateConversionPayload): Promise<Conversion> {
  return apiJson(`/nx03/conversion`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateConversion(
  id: string,
  payload: UpdateConversionPayload,
): Promise<Conversion> {
  return apiJson(`/nx03/conversion/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function softDeleteConversion(id: string): Promise<{ ok: boolean }> {
  return apiJson(`/nx03/conversion/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
