/**
 * File: apps/nx-api/src/nx01/po/dto/po.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-PO-DTO-001：採購單 API 請求型別
 */

export type PoItemInputDto = {
  partId: string;
  qty: number;
  unitCost: number;
  rfqItemId?: string | null;
  expectedDate?: string | null;
  remark?: string | null;
};

export type CreatePoBodyDto = {
  warehouseId: string;
  poDate?: string;
  supplierId: string;
  rfqId?: string | null;
  currencyId?: string;
  taxRate?: number;
  taxAmount?: number | null;
  expectedDate?: string | null;
  remark?: string | null;
  items: PoItemInputDto[];
};

export type PatchPoBodyDto = {
  poDate?: string;
  supplierId?: string;
  currencyId?: string;
  taxRate?: number;
  taxAmount?: number | null;
  expectedDate?: string | null;
  remark?: string | null;
  items?: PoItemInputDto[];
};

export type PatchPoStatusBodyDto = {
  status: string;
};

export type PoToRrBodyDto = {
  warehouseId: string;
  items: { poItemId: string; qty: number; locationId?: string | null }[];
};
