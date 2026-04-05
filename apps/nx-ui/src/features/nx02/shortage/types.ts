/**
 * File: apps/nx-ui/src/features/nx02/shortage/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHOR-UI-TYP-001：缺貨簿列表型別
 */

export type ShortageRow = {
  id: string;
  partId: string;
  partNo: string;
  partName: string;
  warehouseId: string;
  warehouseName: string;
  onHandQty: number;
  minQty: number;
  shortageQty: number;
  suggestOrderQty: number;
  detectedAt: string;
  status: string;
  refRfqId: string | null;
};

export type ShortageListResponse = {
  page: number;
  pageSize: number;
  total: number;
  rows: ShortageRow[];
};
