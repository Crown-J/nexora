/**
 * File: apps/nx-ui/src/features/nx02/init/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-TYP-001：開帳存 DTO
 */

export type InitListRowDto = {
  id: string;
  docNo: string;
  warehouseId: string;
  warehouseName: string;
  initDate: string;
  itemCount: number;
  status: string;
  createdAt: string;
};

export type InitItemDto = {
  id: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  locationId: string | null;
  /** 庫位代碼（唯讀顯示；與 nx00_location.code 對齊） */
  locationCode?: string | null;
  /** 庫位名稱（唯讀顯示） */
  locationName?: string | null;
  qty: number;
  unitCost: number;
  totalCost: number;
  remark: string | null;
};

export type InitDetailDto = {
  id: string;
  docNo: string;
  warehouseId: string;
  warehouseName: string;
  initDate: string;
  status: string;
  remark: string | null;
  createdAt: string;
  postedAt: string | null;
  voidedAt: string | null;
  items: InitItemDto[];
};

export type InitListResponse = {
  data: InitListRowDto[];
  total: number;
  page: number;
  pageSize: number;
};
