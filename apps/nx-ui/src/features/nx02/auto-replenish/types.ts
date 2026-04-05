/**
 * File: apps/nx-ui/src/features/nx02/auto-replenish/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-AURE-UI-TYP-001：自動補貨規則型別
 */

export type AutoReplenishRow = {
  id: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  priority: number;
  isActive: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutoReplenishListResponse = {
  rows: AutoReplenishRow[];
};

export type AutoReplenishDetail = {
  id: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  priority: number;
  isActive: boolean;
  remark: string | null;
};
