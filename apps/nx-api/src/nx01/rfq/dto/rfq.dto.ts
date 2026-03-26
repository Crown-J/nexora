/**
 * File: apps/nx-api/src/nx01/rfq/dto/rfq.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-API-RFQ-DTO-001：RFQ DTO（採購模組）
 */

export type RfqItemDto = {
  id: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;

  unitPrice: string | null;
  leadTimeDays: number | null;
  currency: string;

  status: string;
  remark: string | null;
};

export type RfqDto = {
  id: string;
  docNo: string;
  rfqDate: string;

  supplierId: string;
  contactName: string | null;
  contactPhone: string | null;

  currency: string;
  status: string;
  remark: string | null;

  createdAt: string;
  updatedAt: string;

  items: RfqItemDto[];
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListRfqQuery = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type CreateRfqItemBody = {
  partId: string;
  qty: number | string;
  unitPrice: number | string;
  leadTimeDays?: number | null;
  remark?: string | null;
};

export type CreateRfqBody = {
  docNo: string;
  rfqDate: string; // ISO date (yyyy-mm-dd)
  supplierId: string;

  contactName?: string | null;
  contactPhone?: string | null;
  currency?: string; // default TWD
  remark?: string | null;

  items: CreateRfqItemBody[];
};

export type UpdateRfqItemBody = {
  id?: string; // MVP：允許忽略 id，直接以新 items 取代
  partId: string;
  qty: number | string;
  unitPrice?: number | string | null;
  leadTimeDays?: number | null;
  remark?: string | null;
};

export type UpdateRfqBody = {
  contactName?: string | null;
  contactPhone?: string | null;
  currency?: string;
  remark?: string | null;

  items: UpdateRfqItemBody[];
};

export type ToPoFromRfqBody = {
  docNo: string;
  poDate: string; // ISO date
  warehouseId: string;
  locationId?: string | null;
  currency?: string; // default TWD
  remark?: string | null;
};

