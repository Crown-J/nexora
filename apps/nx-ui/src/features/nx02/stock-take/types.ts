/**
 * File: apps/nx-ui/src/features/nx02/stock-take/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-UI-TYP-001
 */

export type StockTakeListRowDto = {
  id: string;
  docNo: string;
  warehouseId: string;
  warehouseName: string;
  stockTakeDate: string;
  scopeType: string;
  itemCount: number;
  countedDoneCount: number;
  status: string;
  createdAt: string;
};

export type StockTakeItemDto = {
  id: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  warehouseId: string;
  locationId: string;
  systemQty: number;
  countedQty: number | null;
  diffQty: number;
  unitCost: number;
  diffCost: number;
  adjustType: string;
  status: string;
  remark: string | null;
};

export type StockTakeDetailDto = {
  id: string;
  docNo: string;
  warehouseId: string;
  warehouseName: string;
  stockTakeDate: string;
  scopeType: string;
  status: string;
  remark: string | null;
  createdAt: string;
  postedAt: string | null;
  voidedAt: string | null;
  items: StockTakeItemDto[];
};

export type StockTakeListResponse = {
  data: StockTakeListRowDto[];
  total: number;
  page: number;
  pageSize: number;
};
