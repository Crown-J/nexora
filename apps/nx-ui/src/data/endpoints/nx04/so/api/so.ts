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
  ReturnableSo,
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

/// 即時銷退站 5：該客戶可退貨 SO＋行（含已退量/可退量）
export function listReturnableSoLines(customerId: string): Promise<ReturnableSo[]> {
  const qs = buildQueryString({ customerId });
  return apiJson(`/nx04/so/returnable-lines${qs}`);
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

// ============================================================
// 保固查詢（九宮格 銷售第 8 格、規格 §4.2）
// ⚠️ 系統沒有銷售端保固紀錄表、零件保固月數目前全為 0
//    → warrantyUntil / inWarranty 會是 null，⛔ 不猜期限。
//    這支先回答「這個客戶買過這顆嗎、什麼時候買的」。
// ============================================================

export type WarrantyLookupRow = {
  docNo: string;
  soDate: string | null;
  customerCode: string | null;
  customerName: string | null;
  partCode: string;
  partName: string;
  qty: string;
  unitPrice: string;
  warrantyMonths: number;
  /** 零件沒填保固月數時為 null */
  warrantyUntil: string | null;
  /** 算不出來時為 null（畫面顯示「不知道」而不是「已過保」）*/
  inWarranty: boolean | null;
};

/** customerId 與 partNo 都選填，但至少要給一個 */
export function getWarrantyLookup(params: {
  customerId?: string;
  partNo?: string;
}): Promise<{ rows: WarrantyLookupRow[] }> {
  const qs = buildQueryString({
    customerId: params.customerId || undefined,
    partNo: params.partNo || undefined,
  });
  return apiJson(`/nx04/so/warranty-lookup${qs}`);
}
