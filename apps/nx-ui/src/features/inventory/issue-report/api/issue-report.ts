// apps/nx-ui/src/features/inventory/issue-report/api/issue-report.ts
// NX03-STOCK-LITE M3-3a：異常回報 API client（對應 apps/nx-api/src/nx03/issue-report/）

import { apiJson } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';

import type {
  CloseIssueReportPayload,
  CreateIssueReportPayload,
  DispositionType,
  DisposeIssueReportPayload,
  IssueReport,
  IssueReportListResponse,
  IssueType,
  UpdateIssueReportPayload,
} from '../types';

export interface ListIssueReportParams {
  page?: number;
  pageSize?: number;
  status?: string;
  issueType?: IssueType;
  dispositionType?: DispositionType;
  warehouseId?: string;
  partId?: string;
  sourceModule?: string;
  search?: string;
}

export function listIssueReport(params: ListIssueReportParams = {}): Promise<IssueReportListResponse> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    status: params.status,
    issueType: params.issueType,
    dispositionType: params.dispositionType,
    warehouseId: params.warehouseId,
    partId: params.partId,
    sourceModule: params.sourceModule,
    search: params.search,
  });
  return apiJson(`/nx03/issue-report${qs}`);
}

export function getIssueReport(id: string): Promise<IssueReport> {
  return apiJson(`/nx03/issue-report/${encodeURIComponent(id)}`);
}

export function createIssueReport(payload: CreateIssueReportPayload): Promise<IssueReport> {
  return apiJson(`/nx03/issue-report`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateIssueReport(
  id: string,
  payload: UpdateIssueReportPayload,
): Promise<IssueReport> {
  return apiJson(`/nx03/issue-report/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function reportIssueReport(id: string): Promise<IssueReport> {
  return apiJson(`/nx03/issue-report/${encodeURIComponent(id)}/report`, { method: 'POST' });
}

export function disposeIssueReport(
  id: string,
  payload: DisposeIssueReportPayload,
): Promise<IssueReport> {
  return apiJson(`/nx03/issue-report/${encodeURIComponent(id)}/dispose`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function closeIssueReport(
  id: string,
  payload: CloseIssueReportPayload = {},
): Promise<IssueReport> {
  return apiJson(`/nx03/issue-report/${encodeURIComponent(id)}/close`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelIssueReport(id: string): Promise<IssueReport> {
  return apiJson(`/nx03/issue-report/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}
