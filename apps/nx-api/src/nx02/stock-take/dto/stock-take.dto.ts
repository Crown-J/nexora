/**
 * File: apps/nx-api/src/nx02/stock-take/dto/stock-take.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-DTO-001：盤點單 API 型別
 */

export type CreateStockTakeBodyDto = {
  warehouseId: string;
  stockTakeDate: string;
  scopeType: 'F' | 'P';
  remark?: string | null;
  partIds?: string[];
};

export type PatchStockTakeItemsBodyDto = {
  items: {
    id: string;
    countedQty?: number | null;
    remark?: string | null;
  }[];
};
