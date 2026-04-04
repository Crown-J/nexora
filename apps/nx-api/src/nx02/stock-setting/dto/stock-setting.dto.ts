/**
 * File: apps/nx-api/src/nx02/stock-setting/dto/stock-setting.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STKG-DTO-001：庫存設定 API 型別
 */

export type UpsertStockSettingBodyDto = {
  partId: string;
  warehouseId: string;
  minQty: number;
  maxQty: number;
  isActive?: boolean;
  remark?: string | null;
};

export type PatchStockSettingBodyDto = {
  minQty?: number;
  maxQty?: number;
  remark?: string | null;
};

export type SetStockSettingActiveBodyDto = {
  isActive: boolean;
};
