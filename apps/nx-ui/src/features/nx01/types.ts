/**
 * File: apps/nx-ui/src/features/nx01/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-UI-TYPES-001：採購模組前端 DTO（對齊 nx-api JSON）
 */

export type Nx01Paged<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type Nx01DashboardStats = {
  rfq: { pending: number; total: number };
  po: { pending: number; total: number };
  rr: { pending: number; total: number };
  posted: { thisMonth: number };
  pr: { inProgress: number };
};

export type RfqListRow = {
  id: string;
  docNo: string;
  rfqDate: string;
  supplierName: string | null;
  itemCount: number;
  status: string;
  createdAt: string;
};

export type RfqItemDto = {
  id: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  qty: number;
  unitPrice: number | null;
  leadTimeDays: number | null;
  status: string;
  remark: string | null;
};

export type RfqDetailDto = {
  id: string;
  docNo: string;
  rfqDate: string;
  supplierId: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  currency: string;
  status: string;
  remark: string | null;
  createdAt: string;
  voidedAt: string | null;
  items: RfqItemDto[];
};

export type PoListRow = {
  id: string;
  docNo: string;
  poDate: string;
  supplierName: string;
  itemCount: number;
  status: string;
  totalAmount: number;
  createdAt: string;
};

export type PoDetailDto = {
  id: string;
  docNo: string;
  poDate: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  rfqId: string | null;
  rfqDocNo: string | null;
  currencyId: string;
  currencyCode: string;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  expectedDate: string | null;
  remark: string | null;
  createdAt: string;
  voidedAt: string | null;
  items: {
    id: string;
    lineNo: number;
    rfqItemId: string | null;
    partId: string;
    partNo: string;
    partName: string;
    qty: number;
    receivedQty: number;
    unitCost: number;
    lineAmount: number;
    expectedDate: string | null;
    remark: string | null;
  }[];
};

export type RrListRow = {
  id: string;
  docNo: string;
  rrDate: string;
  warehouseCode: string;
  supplierName: string;
  itemCount: number;
  status: string;
  totalAmount: number;
  createdAt: string;
};

export type RrDetailDto = {
  id: string;
  docNo: string;
  warehouseId: string;
  warehouseName: string;
  rrDate: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  rfqId: string | null;
  rfqDocNo: string | null;
  poId: string | null;
  poDocNo: string | null;
  currencyId: string;
  currencyCode: string;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  remark: string | null;
  createdAt: string;
  postedAt: string | null;
  voidedAt: string | null;
  items: {
    id: string;
    lineNo: number;
    partId: string;
    partNo: string;
    partName: string;
    locationId: string;
    locationCode: string | null;
    qty: number;
    unitCost: number;
    lineAmount: number;
    poItemId: string | null;
    rfqItemId: string | null;
    remark: string | null;
  }[];
};

export type PrListRow = {
  id: string;
  docNo: string;
  prDate: string;
  supplierName: string;
  itemCount: number;
  status: string;
  totalAmount: number;
  createdAt: string;
};

export type PrDetailDto = {
  id: string;
  docNo: string;
  warehouseId: string;
  warehouseName: string;
  prDate: string;
  supplierId: string;
  supplierName: string;
  rrId: string | null;
  rrDocNo: string | null;
  currencyId: string;
  currencyCode: string;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  remark: string | null;
  createdAt: string;
  postedAt: string | null;
  voidedAt: string | null;
  items: {
    id: string;
    lineNo: number;
    rrItemId: string;
    rrItemQty: number;
    partId: string;
    partNo: string;
    partName: string;
    locationId: string;
    locationCode: string | null;
    qty: number;
    unitCost: number;
    lineAmount: number;
    remark: string | null;
  }[];
};
