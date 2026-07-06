// apps/nx-ui/src/data/endpoints/nx04/record/api/record.ts
// 報價紀錄表 / 詢價紀錄表 API client（對應 apps/nx-api/src/nx04/record/）

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

import type {
  CreateInquiryRecordPayload,
  CreateQuoteRecordPayload,
  InquiryRecord,
  QuoteRecord,
  RecordListResponse,
} from '@data/types/nx04/record';

export interface QuoteRecordListParams {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  customerCode?: string;
  customerName?: string;
  creator?: string;
  partNo?: string;
  source?: 'INSTANT' | 'QUOTE';
}

export function listQuoteRecords(params: QuoteRecordListParams = {}): Promise<RecordListResponse<QuoteRecord>> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    customerCode: params.customerCode,
    customerName: params.customerName,
    creator: params.creator,
    partNo: params.partNo,
    source: params.source,
  });
  return apiJson(`/nx04/quote-record${qs}`);
}

export function createQuoteRecord(payload: CreateQuoteRecordPayload): Promise<{ id: string }> {
  return apiJson(`/nx04/quote-record`, { method: 'POST', body: JSON.stringify(payload) });
}

export interface InquiryRecordListParams {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  partnerCode?: string;
  partnerName?: string;
  creator?: string;
  partNo?: string;
}

export function listInquiryRecords(params: InquiryRecordListParams = {}): Promise<RecordListResponse<InquiryRecord>> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    partnerCode: params.partnerCode,
    partnerName: params.partnerName,
    creator: params.creator,
    partNo: params.partNo,
  });
  return apiJson(`/nx04/inquiry-record${qs}`);
}

export function createInquiryRecord(payload: CreateInquiryRecordPayload): Promise<{ id: string }> {
  return apiJson(`/nx04/inquiry-record`, { method: 'POST', body: JSON.stringify(payload) });
}
