// apps/nx-ui/src/features/sale/quote/api/quote.ts
// NX04-M3 C1：QT 報價單 API client（對應 apps/nx-api/src/nx04/quote/）

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

import type {
  CreateQuoteItemPayload,
  CreateQuotePayload,
  PatchQuoteItemPayload,
  Quote,
  QuoteCandidatesResult,
  QuotePriceHistoryRow,
  QuotePriceIntel,
  QuoteHistoricalPrice,
  QuoteItem,
  QuoteListResponse,
  UpdateQuotePayload,
} from '@data/types/nx04/quote';

export interface ListQuoteParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  // 彈窗查詢欄位
  docNoFrom?: string;
  docNoTo?: string;
  createdFrom?: string;
  createdTo?: string;
  quoteFrom?: string;
  quoteTo?: string;
  validity?: 'valid' | 'expired' | 'void';
  customerCode?: string;
  customerName?: string;
  creator?: string;
  partNo?: string;
  source?: 'FORMAL' | 'INSTANT';
}

export function listQuote(params: ListQuoteParams = {}): Promise<QuoteListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    status: params.status,
    search: params.search,
    docNoFrom: params.docNoFrom,
    docNoTo: params.docNoTo,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    quoteFrom: params.quoteFrom,
    quoteTo: params.quoteTo,
    validity: params.validity,
    customerCode: params.customerCode,
    customerName: params.customerName,
    creator: params.creator,
    partNo: params.partNo,
    source: params.source,
  });
  return apiJson(`/nx04/quote${qs}`);
}

export function getQuote(id: string): Promise<Quote> {
  return apiJson(`/nx04/quote/${encodeURIComponent(id)}`);
}

export function createQuote(payload: CreateQuotePayload): Promise<Quote> {
  return apiJson(`/nx04/quote`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateQuote(id: string, payload: UpdateQuotePayload): Promise<Quote> {
  return apiJson(`/nx04/quote/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function voidQuote(id: string, voidReason?: string): Promise<Quote> {
  const qs = buildQueryString({ voidReason });
  return apiJson(`/nx04/quote/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' });
}

export function addQuoteItem(quoteId: string, payload: CreateQuoteItemPayload): Promise<QuoteItem> {
  return apiJson(`/nx04/quote/${encodeURIComponent(quoteId)}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function patchQuoteItem(
  quoteId: string,
  itemId: string,
  payload: PatchQuoteItemPayload,
): Promise<QuoteItem> {
  return apiJson(
    `/nx04/quote/${encodeURIComponent(quoteId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export function removeQuoteItem(quoteId: string, itemId: string): Promise<{ ok: true }> {
  return apiJson(
    `/nx04/quote/${encodeURIComponent(quoteId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  );
}

/// NX04-M2 §A C1：歷史價提示 endpoint
export function getQuoteHistoricalPrices(
  customerId: string,
  partId: string,
  limit?: number,
): Promise<QuoteHistoricalPrice[]> {
  const qs = buildQueryString({
    customerId,
    partId,
    limit: limit ? String(limit) : undefined,
  });
  return apiJson(`/nx04/quote/history${qs}`);
}

/// F2 工作台階段④屬性 2：報價/成交歷史整合列表（該客戶+同級距、F2-TUNING S4-2）
export function getQuotePriceHistory(
  customerId: string,
  partId: string,
  limit?: number,
): Promise<{ rows: QuotePriceHistoryRow[] }> {
  const qs = buildQueryString({ customerId, partId, limit: limit ? String(limit) : undefined });
  return apiJson(`/nx04/quote/price-history${qs}`);
}

/// 報價比價面板（5 格）：建議售價 + 同客戶/同級距 × 報價/成交（近一個月）
export function getQuotePriceIntel(customerId: string, partId: string): Promise<QuotePriceIntel> {
  const qs = buildQueryString({ customerId, partId });
  return apiJson(`/nx04/quote/price-intel${qs}`);
}

/// 批次報價 picker：整組替代料候選 + 各列可出量/歷史價/建議價
/// ⚠️ 2026-08-01 v3.0.0：customerId 改選填（查價查貨是料號優先、客戶選填）。
///    不帶客戶時 customerLast* 與 suggestedPrice 會是 null，可出量與 partLast* 照給。
export function getQuoteCandidates(
  partId: string,
  customerId?: string,
  warehouseId?: string,
): Promise<QuoteCandidatesResult> {
  const qs = buildQueryString({
    partId,
    customerId: customerId || undefined,
    warehouseId: warehouseId || undefined,
  });
  return apiJson(`/nx04/quote/candidates${qs}`);
}
