/**
 * File: apps/nx-api/src/nx02/init/dto/init.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-DTO-001：開帳存 API 請求／回應型別
 */

export type InitItemInputDto = {
  partId: string;
  locationId?: string | null;
  qty: number;
  unitCost: number;
  remark?: string | null;
};

export type CreateInitBodyDto = {
  warehouseId: string;
  initDate: string;
  remark?: string | null;
  items: InitItemInputDto[];
};

export type PatchInitBodyDto = {
  initDate?: string;
  remark?: string | null;
  items?: InitItemInputDto[];
};
