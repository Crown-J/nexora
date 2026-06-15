// apps/nx-ui/src/features/inventory/stocktake/api/stocktake.ts
// NX03-STOCK-LITE M3-1：盤點 API client（對應 apps/nx-api/src/nx03/stocktake/）

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

import type {
  CreateStockTakeItemPayload,
  CreateStockTakePayload,
  DecideApprovalPayload,
  PatchStockTakeItemPayload,
  StockTake,
  StockTakeItem,
  StockTakeListResponse,
  SubmitForApprovalResponse,
  UpdateStockTakePayload,
} from '../types';

export interface ListStockTakeParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export function listStockTake(params: ListStockTakeParams = {}): Promise<StockTakeListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    status: params.status,
    search: params.search,
  });
  return apiJson(`/nx03/stocktake${qs}`);
}

export function getStockTake(id: string): Promise<StockTake> {
  return apiJson(`/nx03/stocktake/${encodeURIComponent(id)}`);
}

export function createStockTake(payload: CreateStockTakePayload): Promise<StockTake> {
  return apiJson(`/nx03/stocktake`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateStockTake(id: string, payload: UpdateStockTakePayload): Promise<StockTake> {
  return apiJson(`/nx03/stocktake/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function softDeleteStockTake(id: string): Promise<StockTake> {
  return apiJson(`/nx03/stocktake/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function addStockTakeItem(
  stockTakeId: string,
  payload: CreateStockTakeItemPayload,
): Promise<StockTakeItem> {
  return apiJson(`/nx03/stocktake/${encodeURIComponent(stockTakeId)}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function patchStockTakeItem(
  stockTakeId: string,
  itemId: string,
  payload: PatchStockTakeItemPayload,
): Promise<StockTakeItem> {
  return apiJson(
    `/nx03/stocktake/${encodeURIComponent(stockTakeId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export function removeStockTakeItem(
  stockTakeId: string,
  itemId: string,
): Promise<{ ok: boolean }> {
  return apiJson(
    `/nx03/stocktake/${encodeURIComponent(stockTakeId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  );
}

export function submitForApproval(id: string): Promise<SubmitForApprovalResponse> {
  return apiJson(`/nx03/stocktake/${encodeURIComponent(id)}/submit-for-approval`, {
    method: 'POST',
  });
}

export function decideApproval(id: string, payload: DecideApprovalPayload): Promise<StockTake> {
  return apiJson(`/nx03/stocktake/${encodeURIComponent(id)}/decide-approval`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
