/**
 * File: apps/nx-ui/src/features/nx02/ledger/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-LED-UI-TYP-001：庫存台帳 API 型別
 */

export type LedgerRowDto = {
  id: string;
  movementDate: string;
  movementType: string;
  sourceDocType: string;
  sourceDocId: string;
  partId: string;
  partCode: string;
  partName: string;
  warehouseName: string;
  locationName: string | null;
  qtyIn: number | null;
  qtyOut: number | null;
  unitCost: number;
  totalCost: number;
  balanceQty: number;
  balanceCost: number;
  sourceModule: string;
};

export type LedgerListResponse = {
  data: LedgerRowDto[];
  total: number;
  page: number;
  pageSize: number;
};
