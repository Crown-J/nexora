/**
 * File: apps/nx-api/src/nx01/rr/dto/rr.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-RR-DTO-001：進貨單 API 請求型別
 */

export type RrItemInputDto = {
  partId: string;
  locationId: string;
  qty: number;
  unitCost: number;
  poItemId?: string | null;
  /** 來自詢價明細；過帳後將該 rfq_item 標為 S（已選用） */
  rfqItemId?: string | null;
  remark?: string | null;
};

export type CreateRrBodyDto = {
  warehouseId: string;
  rrDate?: string;
  supplierId: string;
  rfqId?: string | null;
  poId?: string | null;
  currencyId?: string;
  taxRate?: number;
  taxAmount?: number | null;
  remark?: string | null;
  items: RrItemInputDto[];
};

export type PatchRrBodyDto = {
  rrDate?: string;
  supplierId?: string;
  currencyId?: string;
  taxRate?: number;
  taxAmount?: number | null;
  remark?: string | null;
  items?: RrItemInputDto[];
};
