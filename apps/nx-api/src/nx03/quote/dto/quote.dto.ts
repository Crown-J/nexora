/**
 * File: apps/nx-api/src/nx03/quote/dto/quote.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03-API-QUOTE-DTO-001：QUOTE（對客報價）DTO
 */

export type QuoteItemDto = {
  id: string;
  lineNo: number;

  rfqItemId: string;
  partId: string;
  partNo: string;
  partName: string;

  qty: string;
  unitCost: string;
  unitPrice: string;

  markupType: string | null;
  markupValue: string | null;

  currency: string;
  leadTimeDays: number | null;
  remark: string | null;
};

export type QuoteDto = {
  id: string;
  docNo: string;
  quoteDate: string;

  customerId: string;
  rfqId: string | null;

  currency: string;
  status: string;
  remark: string | null;

  createdAt: string;
  updatedAt: string;

  items: QuoteItemDto[];
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListQuoteQuery = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type CreateQuoteItemBody = {
  rfqItemId: string;
  qty?: number | string; // 若不填則使用 RFQ item qty
};

export type CreateQuoteBody = {
  docNo: string;
  quoteDate: string; // ISO date
  customerId: string;
  rfqId: string;

  currency?: string;

  /**
   * markupType:
   * - 'P'：百分比（markupValue = 10 → +10%）
   * - 'A'：加價金額（markupValue = 50 → +50）
   */
  markupType: 'P' | 'A';
  markupValue: number | string;

  remark?: string | null;
  items: CreateQuoteItemBody[];
};

export type AcceptQuoteBody = {
  poDocNo: string;
  poDate: string;
  soDocNo: string;
  soDate: string;

  warehouseId: string;
  locationId?: string | null;

  poRemark?: string | null;
  soRemark?: string | null;
};

