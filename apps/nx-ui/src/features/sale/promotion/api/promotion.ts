// apps/nx-ui/src/features/sale/promotion/api/promotion.ts
// F1-D 銷貨優惠價子系統 2026-06-08：促銷規則 API client

import { apiJson } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';

import type {
  CreatePromotionPayload,
  CreatePromotionScopePayload,
  Promotion,
  PromotionListResponse,
  UpdatePromotionPayload,
} from '../types';

export interface ListPromotionParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  isClearance?: boolean;
}

export function listPromotion(params: ListPromotionParams = {}): Promise<PromotionListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    search: params.search,
    isActive: params.isActive !== undefined ? String(params.isActive) : undefined,
    isClearance: params.isClearance !== undefined ? String(params.isClearance) : undefined,
  });
  return apiJson(`/nx04/promotion${qs}`);
}

export function getPromotion(id: string): Promise<Promotion> {
  return apiJson(`/nx04/promotion/${encodeURIComponent(id)}`);
}

export function createPromotion(payload: CreatePromotionPayload): Promise<Promotion> {
  return apiJson(`/nx04/promotion`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePromotion(id: string, payload: UpdatePromotionPayload): Promise<Promotion> {
  return apiJson(`/nx04/promotion/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function replacePromotionScopes(
  id: string,
  scopes: CreatePromotionScopePayload[],
): Promise<Promotion> {
  return apiJson(`/nx04/promotion/${encodeURIComponent(id)}/scopes`, {
    method: 'PUT',
    body: JSON.stringify({ scopes }),
  });
}

export function voidPromotion(id: string): Promise<unknown> {
  return apiJson(`/nx04/promotion/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** F1-D 全域即期門檻 */
export function getShelfLifeWarningDays(): Promise<{ shelfLifeWarningDays: number }> {
  return apiJson(`/nx04/promotion/settings/shelf-life-warning-days`);
}

export function setShelfLifeWarningDays(days: number): Promise<{ shelfLifeWarningDays: number }> {
  return apiJson(`/nx04/promotion/settings/shelf-life-warning-days`, {
    method: 'PUT',
    body: JSON.stringify({ shelfLifeWarningDays: days }),
  });
}
