// apps/nx-ui/src/features/sale/so/api/so.ts
// NX04-M3 C2：SO 銷貨單 API client（對應 apps/nx-api/src/nx04/so/）

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

import type {
  CreateSoItemPayload,
  CreateSoPayload,
  CreateTiFromSoPayload,
  CreateTiFromSoResponse,
  OpenQuoteLine,
  PatchSoItemPayload,
  PendingTransferLinesResponse,
  So,
  SoItem,
  SoListResponse,
  UpdateSoPayload,
} from '@data/types/nx04/so';

export interface ListSoParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export function listSo(params: ListSoParams = {}): Promise<SoListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    status: params.status,
    search: params.search,
  });
  return apiJson(`/nx04/so${qs}`);
}

export function getSo(id: string): Promise<So> {
  return apiJson(`/nx04/so/${encodeURIComponent(id)}`);
}

export function createSo(payload: CreateSoPayload): Promise<So> {
  return apiJson(`/nx04/so`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createSoFromQuote(quoteId: string): Promise<So> {
  return apiJson(`/nx04/so/from-quote/${encodeURIComponent(quoteId)}`, {
    method: 'POST',
  });
}

export function updateSo(id: string, payload: UpdateSoPayload): Promise<So> {
  return apiJson(`/nx04/so/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function softDeleteSo(id: string, cancelReason?: string): Promise<So> {
  const qs = buildQueryString({ cancelReason });
  return apiJson(`/nx04/so/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' });
}

export function addSoItem(soId: string, payload: CreateSoItemPayload): Promise<SoItem> {
  return apiJson(`/nx04/so/${encodeURIComponent(soId)}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function patchSoItem(
  soId: string,
  itemId: string,
  payload: PatchSoItemPayload,
): Promise<SoItem> {
  return apiJson(
    `/nx04/so/${encodeURIComponent(soId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export function removeSoItem(soId: string, itemId: string): Promise<{ ok: true }> {
  return apiJson(
    `/nx04/so/${encodeURIComponent(soId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  );
}

/// 拉報價 picker：列出該客戶 OPEN 報價行
export function listOpenQuoteLines(customerId: string): Promise<OpenQuoteLine[]> {
  const qs = buildQueryString({ customerId });
  return apiJson(`/nx04/so/quote-lines/open${qs}`);
}

/// SO 待調貨行清單（給 IT-O 觸發 UI 用）
export function listPendingTransferLines(soId: string): Promise<PendingTransferLinesResponse> {
  return apiJson(`/nx04/so/${encodeURIComponent(soId)}/pending-transfer-lines`);
}

/// 從 SO 觸發建立同行調貨單 IT-O
export function createTiFromSo(
  soId: string,
  payload: CreateTiFromSoPayload,
): Promise<CreateTiFromSoResponse> {
  return apiJson(`/nx04/so/${encodeURIComponent(soId)}/create-ti`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
