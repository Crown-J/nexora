// apps/nx-ui/src/features/sale/quote/api/quote.ts
// NX04-M3 C1：QT 報價單 API client（對應 apps/nx-api/src/nx04/quote/）

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

import type {
  CreateQuoteItemPayload,
  CreateQuotePayload,
  PatchQuoteItemPayload,
  Quote,
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
