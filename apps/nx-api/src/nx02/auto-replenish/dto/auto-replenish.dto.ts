/**
 * File: apps/nx-api/src/nx02/auto-replenish/dto/auto-replenish.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-AURE-DTO-001：自動補貨設定 API 請求型別
 */

export type CreateAutoReplenishBodyDto = {
  fromWarehouseId: string;
  toWarehouseId: string;
  priority?: number;
  isActive?: boolean;
  remark?: string | null;
};

export type PatchAutoReplenishBodyDto = {
  fromWarehouseId?: string;
  toWarehouseId?: string;
  priority?: number;
  remark?: string | null;
};

export type PatchAutoReplenishActiveBodyDto = {
  isActive: boolean;
};
