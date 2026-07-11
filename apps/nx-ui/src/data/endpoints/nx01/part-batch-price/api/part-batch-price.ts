// apps/nx-ui/src/data/endpoints/nx01/part-batch-price/api/part-batch-price.ts
// 偉盟 P2 2.8 Step 3 2026-07-11：批次調價工具 API client

import { apiJson } from '@data/api/client';

export type PriceTarget = 'A' | 'B' | 'C' | 'D';

export interface BatchPriceFilter {
  brandId?: string;
  partGroupId?: string;
  purchaseCategory?: number;
  techCategory?: number;
  isOem?: boolean;
  search?: string;
}

export interface BatchPriceAdjust {
  mode: 'PCT' | 'AMT';
  value: number;
  targets: PriceTarget[];
  rounding: 'INT' | 'NONE';
}

export interface BatchPricePayload {
  filter: BatchPriceFilter;
  adjust: BatchPriceAdjust;
  confirmAll?: boolean;
}

export interface BatchPricePreviewRow {
  partId: string;
  code: string;
  name: string;
  old: Record<PriceTarget, number>;
  new: Partial<Record<PriceTarget, number>>;
}

export interface BatchPricePreviewResult {
  total: number;
  previewLimit: number;
  rows: BatchPricePreviewRow[];
}

export function previewBatchPrice(payload: BatchPricePayload): Promise<BatchPricePreviewResult> {
  return apiJson(`/nx01/part-batch-price/preview`, { method: 'POST', body: JSON.stringify(payload) });
}

export function applyBatchPrice(payload: BatchPricePayload): Promise<{ affected: number }> {
  return apiJson(`/nx01/part-batch-price/apply`, { method: 'POST', body: JSON.stringify(payload) });
}
