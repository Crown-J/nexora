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
