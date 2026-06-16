// apps/nx-ui/src/features/inventory/conversion/types.ts
// NX03-STOCK-LITE M3-3b：重組 / 分解型別（對齊 nx-api CV_SEL / CV_INPUT_SEL / CV_OUTPUT_SEL）
//
// conversionType:
//   M = Merge 重組：N inputs → 1 output（output.unitCost = Σ input.totalCost / output.qty）
//   D = Disassemble 分解：1 input → N outputs（costRatio auto 用 part.priceA / manual 用人工）

export type ConversionType = 'M' | 'D';
export type ConversionStatus = 'DRAFT' | 'POSTED' | 'VOIDED';

export interface ConversionInput {
  id: string;
  conversionId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  partVersionId: string | null;
  locationId: string;
  qty: string;
  unitCost: string;
  totalCost: string;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ConversionOutput {
  id: string;
  conversionId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  partVersionId: string | null;
  locationId: string;
  qty: string;
  unitCost: string;
  totalCost: string;
  costRatio: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Conversion {
  id: string;
  tenantId: string;
  docNo: string;
  warehouseId: string;
  conversionDate: string;
  conversionType: ConversionType;
  status: ConversionStatus;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  postedAt: string | null;
  postedBy: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  inputs?: ConversionInput[];
  outputs?: ConversionOutput[];
}

export interface ConversionListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Conversion[];
}

export interface CreateConversionInputPayload {
  partId: string;
  locationId: string;
  qty: number;
  unitCost?: number;
  remark?: string;
}

export interface CreateConversionOutputPayload {
  partId: string;
  locationId: string;
  qty: number;
  costRatio?: number;
  remark?: string;
}

export interface CreateConversionPayload {
  warehouseId: string;
  conversionDate: string;
  conversionType: ConversionType;
  remark?: string;
  inputs: CreateConversionInputPayload[];
  outputs: CreateConversionOutputPayload[];
}

export interface UpdateConversionPayload {
  conversionDate?: string;
  remark?: string;
  status?: ConversionStatus;
}
