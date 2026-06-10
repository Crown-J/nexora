/**
 * File: apps/nx-ui/src/features/nx02/balance/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-BAL-UI-TYP-001：庫存一覽 API 型別
 */

export type BalanceRowDto = {
  id: string;
  partId: string;
  partCode: string;
  partName: string;
  brandName: string | null;
  warehouseId: string;
  warehouseName: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  inTransitQty: number;
  uom: string;
  avgCost: number;
  stockValue: number;
  minQty: number | null;
  lastMoveAt: string;
};

export type BalanceListResponse = {
  data: BalanceRowDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type BalanceSummaryResponse = {
  total: number;
  inStock: number;
  zero: number;
  negative: number;
};

export type WarehouseOption = { id: string; code: string; name: string };
