// apps/nx-ui/src/features/sale/promotion/api/promotion.ts
// F1-D 銷貨優惠價子系統 2026-06-08：促銷規則 API client

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

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

/** F1-E 引擎：開單時取建議價 + 警示 */
export interface PriceCandidate {
  source: 'NORMAL' | 'PROMOTION' | 'EXPIRY';
  price: string;
  code?: string;
  name?: string;
  promotionId?: string;
  isClearance?: boolean;
}

export interface ExpiryInfo {
  rrItemId: string | null;
  warrantyExpiredAt: string | null;
  effectiveExpiry: string | null;
  remainingDays: number | null;
  thresholdDays: number;
  isExpiring: boolean;
  fallbackUsed: boolean;
}

export interface ResolvePriceResult {
  partId: string;
  customerId: string;
  qty: string;
  asOfDate: string;
  normalPrice: string | null;
  normalPriceSource: 'GRADE_PRICE' | 'NONE';
  gradeCode: string | null;
  candidates: PriceCandidate[];
  applicablePromotions: PriceCandidate[];
  suggested: PriceCandidate;
  expiry: ExpiryInfo;
  cost: string | null;
  minPrice: string | null;
  belowCost: boolean;
  belowMinPrice: boolean;
}

export interface ResolvePriceParams {
  customerId: string;
  partId: string;
  qty: string | number;
  asOfDate?: string;
  rrItemId?: string;
  warehouseId?: string;
}

export function resolvePromotionPrice(params: ResolvePriceParams): Promise<ResolvePriceResult> {
  const qs = buildQueryString({
    customerId: params.customerId,
    partId: params.partId,
    qty: String(params.qty),
    asOfDate: params.asOfDate,
    rrItemId: params.rrItemId,
    warehouseId: params.warehouseId,
  });
  return apiJson(`/nx04/promotion/resolve${qs}`);
}
