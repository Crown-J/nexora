/**
 * File: apps/nx-api/src/nx02/transfer/dto/transfer.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-XFER-DTO-001：調撥單 API 請求型別
 */

export type TransferItemInputDto = {
  partId: string;
  qty: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  remark?: string | null;
};

export type CreateTransferBodyDto = {
  fromWarehouseId: string;
  toWarehouseId: string;
  stDate: string;
  remark?: string | null;
  items: TransferItemInputDto[];
};

export type PatchTransferBodyDto = {
  stDate?: string;
  remark?: string | null;
  items?: TransferItemInputDto[];
};
