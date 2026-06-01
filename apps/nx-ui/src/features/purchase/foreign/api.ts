// apps/nx-ui/src/features/purchase/foreign/api.ts
// v1.2 階段 I P4：國外進貨 API client
//
// 接既有後端：
//   - GET /nx02/po?purchaseType=I    國外 PO list
//   - GET /nx02/po/:id               PO detail（含 6 階段欄位）
//   - PATCH /nx02/po/:id/stage       6 階段流轉
//   - GET /nx03/parcel               提貨包裹列表（後續軌）

import { apiJson } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';

export type PoStatus = string; // DRAFT/APPROVED/SUBMITTED/CONFIRMED/PARTIAL_RECEIVED/RECEIVED/CLOSED/CANCELLED
export type PurchaseType = 'D' | 'I' | 'B';
export type PurchaseStage = 1 | 2 | 3 | 4 | 5 | 6;

export interface ForeignPo {
  id: string;
  docNo: string;
  poDate: string;
  supplierId: string;
  status: PoStatus;
  totalAmount: string;
  purchaseType: PurchaseType;
  purchaseStage: PurchaseStage | null;
  paymentTermImport?: string | null;
  incoterm?: string | null;
  vesselNo?: string | null;
  containerNo?: string | null;
  eta?: string | null;
  requestedPaymentAt?: string | null;
  paidAt?: string | null;
  shippedAt?: string | null;
  arrivedAt?: string | null;
  remark?: string | null;
  createdAt: string;
}

export interface ForeignPoItem {
  id: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
  receivedQty: string;
  unitCost: string;
  lineAmount: string;
}

export interface ForeignPoDetail extends ForeignPo {
  items?: ForeignPoItem[];
  rev_Nx02PoItem_poId?: ForeignPoItem[];
}

export interface ListForeignPoParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export function listForeignPos(params: ListForeignPoParams = {}): Promise<{
  page: number;
  pageSize: number;
  total: number;
  rows: ForeignPo[];
}> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    status: params.status,
    search: params.search,
    purchaseType: 'I',
  });
  return apiJson(`/nx02/po${qs}`);
}

export function getForeignPo(id: string): Promise<ForeignPoDetail> {
  return apiJson(`/nx02/po/${encodeURIComponent(id)}`);
}

export function transitStage(
  id: string,
  targetStage: PurchaseStage,
  note?: string,
): Promise<ForeignPoDetail> {
  return apiJson(`/nx02/po/${encodeURIComponent(id)}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ targetStage, note }),
  });
}
