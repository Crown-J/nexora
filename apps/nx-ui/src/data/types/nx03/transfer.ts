/**
 * File: apps/nx-ui/src/features/nx02/transfer/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-XFER-UI-TYP-001：調撥單 DTO 型別
 */

export type TransferListRow = {
  id: string;
  docNo: string;
  stDate: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  itemCount: number;
  status: string;
};

export type TransferListResponse = {
  page: number;
  pageSize: number;
  total: number;
  rows: TransferListRow[];
};

export type TransferItemDetail = {
  id: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  fromLocationId: string | null;
  fromLocationCode: string | null;
  fromLocationName: string | null;
  toLocationId: string | null;
  toLocationCode: string | null;
  toLocationName: string | null;
  qty: number;
  unitCost: number;
  remark: string | null;
  fromWarehouseOnHand: number;
};

export type TransferDetailDto = {
  id: string;
  docNo: string;
  stDate: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  status: string;
  remark: string | null;
  createdAt: string;
  postedAt: string | null;
  voidedAt: string | null;
  items: TransferItemDetail[];
};

// ─────────────────────────────────────────────────────────
// NX04-QT-SHELL 2026-07-10：單據模板用型別（對齊真後端 /nx03/transfer 回傳；
// 上面舊型別對應已不存在的 /nx02/transfer、留給舊視圖過渡、勿再新用）
// ─────────────────────────────────────────────────────────

export const ST_STATUSES = ['DRAFT', 'TRANSIT', 'RECEIVED', 'CANCELLED'] as const;
export type StStatus = (typeof ST_STATUSES)[number];

export const ST_STATUS_LABEL: Record<StStatus, string> = {
  DRAFT: '草稿',
  TRANSIT: '調撥中（已出庫）',
  RECEIVED: '已收貨（過帳）',
  CANCELLED: '已作廢',
};

export interface StItem {
  id: string;
  stId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  brandId: string | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  qty: string;
  unitCost: string;
  receivedQty: string | null;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface St {
  id: string;
  tenantId: string;
  docNo: string;
  stDate: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: StStatus;
  remark: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  postedAt: string | null;
  postedBy: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  items?: StItem[];
  // enriched（後端 TR_SEL/list 回傳）
  fromWarehouseCode?: string | null;
  fromWarehouseName?: string | null;
  toWarehouseCode?: string | null;
  toWarehouseName?: string | null;
  createdByName?: string | null;
  itemCount?: number;
}

export interface StListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: St[];
}

export interface CreateStItemPayload {
  partId: string;
  fromLocationId: string;
  toLocationId: string;
  qty: number;
  unitCost?: number;
  remark?: string;
}

export interface CreateStPayload {
  fromWarehouseId: string;
  toWarehouseId: string;
  stDate: string;
  remark?: string;
  items?: CreateStItemPayload[];
}

export interface UpdateStPayload {
  stDate?: string;
  remark?: string;
  /** DRAFT→TRANSIT（出庫）、TRANSIT→RECEIVED（收貨過帳、動庫存） */
  status?: StStatus;
}

export interface PatchStItemPayload {
  fromLocationId?: string;
  toLocationId?: string;
  qty?: number;
  unitCost?: number;
  remark?: string;
}
