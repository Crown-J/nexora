/**
 * File: apps/nx-api/src/nx03/sales-order/dto/sales-order.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03-API-SALES-ORDER-DTO-001：SO DTO
 */

export type SalesOrderItemDto = {
  id: string;
  lineNo: number;

  quoteItemId: string;
  partId: string;
  partNo: string;
  partName: string;

  qty: string;
  unitPrice: string;

  warehouseId: string;
  locationId: string | null;

  remark: string | null;
};

export type SalesOrderDto = {
  id: string;
  docNo: string;
  soDate: string;

  customerId: string;
  quoteId: string;

  currency: string;
  status: string;
  remark: string | null;

  postedAt: string | null;
  createdAt: string;
  updatedAt: string;

  items: SalesOrderItemDto[];
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListSalesOrderQuery = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

