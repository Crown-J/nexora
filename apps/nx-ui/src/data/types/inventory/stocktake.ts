// apps/nx-ui/src/features/inventory/stocktake/types.ts
// NX03-STOCK-LITE M3-1：盤點工作台型別（對齊 nx-api ST_SEL / ST_ITEM_SEL）

export type StockTakeStatus = 'DRAFT' | 'COUNTING' | 'ADJUSTING' | 'POSTED' | 'CANCELLED';
export type ApprovalStatus = 'N' | 'P' | 'A' | 'R';
export type AdjustType = 'I' | 'O' | 'N';
export type VarianceReasonCode = 'S' | 'M' | 'B' | 'U';

export interface StockTakeItem {
  id: string;
  stockTakeId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  partVersionId: string | null;
  warehouseId: string;
  locationId: string;
  systemQty: string;
  countedQty: string;
  diffQty: string;
  unitCost: string;
  diffCost: string;
  adjustType: AdjustType;
  status: string;
  remark: string | null;
  snapshotQty: string;
  deltaQty: string;
  formulaExpectedQty: string;
  realDiffQty: string;
  varianceReasonCode: VarianceReasonCode | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockTake {
  id: string;
  tenantId: string;
  docNo: string;
  warehouseId: string;
  stockTakeDate: string;
  scopeType: string;
  status: StockTakeStatus;
  remark: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  postedAt: string | null;
  postedBy: string | null;
  startedAt: string | null;
  snapshotStartedAt: string | null;
  snapshotEndedAt: string | null;
  smallToleranceQty: string;
  approvalStatus: ApprovalStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  items?: StockTakeItem[];
}

export interface StockTakeListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: StockTake[];
}

export interface CreateStockTakePayload {
  warehouseId: string;
  stockTakeDate: string;
  scopeType?: string;
  remark?: string;
  smallToleranceQty?: number;
  items?: CreateStockTakeItemPayload[];
}

export interface CreateStockTakeItemPayload {
  partId: string;
  locationId: string;
  warehouseId?: string;
  countedQty?: number;
  remark?: string;
}

export interface PatchStockTakeItemPayload {
  countedQty?: number;
  remark?: string;
  varianceReasonCode?: VarianceReasonCode;
}

export interface UpdateStockTakePayload {
  stockTakeDate?: string;
  remark?: string;
  status?: StockTakeStatus;
  smallToleranceQty?: number;
}

export interface SubmitForApprovalResponse {
  approvalStatus: ApprovalStatus;
  maxItemDiffCost: string;
  smallToleranceQty: string;
  autoPass: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface DecideApprovalPayload {
  decision: 'A' | 'R';
  remark?: string;
}
