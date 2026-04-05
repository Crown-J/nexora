/**
 * File: apps/nx-api/src/nx01/pr/dto/pr.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-PR-DTO-001：退貨單 API 請求型別
 */

export type CreatePrItemInputDto = {
  rrItemId: string;
  qty: number;
  locationId?: string | null;
  remark?: string | null;
};

export type CreatePrBodyDto = {
  rrId: string;
  supplierId: string;
  warehouseId: string;
  prDate?: string;
  currencyId?: string;
  taxRate?: number;
  taxAmount?: number | null;
  remark?: string | null;
  items: CreatePrItemInputDto[];
};

export type PatchPrBodyDto = {
  prDate?: string;
  supplierId?: string;
  currencyId?: string;
  taxRate?: number;
  taxAmount?: number | null;
  remark?: string | null;
  items?: CreatePrItemInputDto[];
};
