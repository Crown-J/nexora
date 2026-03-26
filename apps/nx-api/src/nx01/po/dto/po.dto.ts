/**
 * File: apps/nx-api/src/nx01/po/dto/po.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-API-PO-DTO-001：PO DTO（採購模組）
 */

export type PoItemDto = {
  id: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;

  warehouseId: string;
  locationId: string | null;

  qty: string;
  unitCost: string;
  lineAmount: string;

  remark: string | null;
};

export type PoDto = {
  id: string;
  docNo: string;
  poDate: string;

  supplierId: string;
  rfqId: string | null;

  currency: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;

  status: string;
  postedAt: string | null;
  remark: string | null;

  items: PoItemDto[];
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListPoQuery = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

