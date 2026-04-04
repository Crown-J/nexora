/**
 * File: apps/nx-ui/src/features/nx02/stock-setting/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STKG-UI-TYP-001
 */

export type StockSettingRowDto = {
  id: string;
  partId: string;
  partCode: string;
  partName: string;
  warehouseId: string;
  warehouseName: string;
  minQty: number;
  maxQty: number;
  reorderQty: number;
  onHandQty: number;
  availableQty: number;
  isShortage: boolean;
  isActive: boolean;
  remark: string | null;
};

export type StockSettingListResponse = {
  data: StockSettingRowDto[];
  total: number;
  page: number;
  pageSize: number;
};
