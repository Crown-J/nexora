// apps/nx-ui/src/features/sale/promotion/types.ts
// F1-D 銷貨優惠價子系統 2026-06-08：促銷規則型別

export const SCOPE_TYPES = ['P', 'B', 'G'] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export const SCOPE_TYPE_LABEL: Record<ScopeType, string> = {
  P: '指定料件',
  B: '品牌',
  G: '料件族群',
};

export interface PromotionScope {
  id: string;
  promotionId: string;
  scopeType: ScopeType;
  scopeId: string;
  createdAt: string;
  createdBy: string;
}

export interface Promotion {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  priceOverride: string;
  validFrom: string;
  validTo: string;
  isClearance: boolean;
  minBuyQty: string | null;
  remark: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  scopes?: PromotionScope[];
}

export interface PromotionListResponse {
  page: number;
  pageSize: number;
  total: number;
  rows: Promotion[];
}

export interface CreatePromotionScopePayload {
  scopeType: ScopeType;
  scopeId: string;
}

export interface CreatePromotionPayload {
  code: string;
  name: string;
  priceOverride: string;
  validFrom: string;
  validTo: string;
  isClearance?: boolean;
  minBuyQty?: string;
  remark?: string;
  isActive?: boolean;
  scopes: CreatePromotionScopePayload[];
}

export interface UpdatePromotionPayload {
  name?: string;
  priceOverride?: string;
  validFrom?: string;
  validTo?: string;
  isClearance?: boolean;
  minBuyQty?: string | null;
  remark?: string | null;
  isActive?: boolean;
}
