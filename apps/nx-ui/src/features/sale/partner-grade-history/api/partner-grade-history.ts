// apps/nx-ui/src/features/sale/partner-grade-history/api/partner-grade-history.ts
// NX04-M3 C5：客戶等級變更核可 API client（對應 apps/nx-api/src/nx04/partner-grade-history/）

import { apiJson } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';

import type {
  CreateGradeChangeRequestPayload,
  PartnerGradeHistoryRow,
  RejectGradeChangePayload,
} from '../types';

export interface ListGradeHistoryParams {
  partnerId?: string;
  status?: string;
}

export function listGradeHistory(params: ListGradeHistoryParams = {}): Promise<PartnerGradeHistoryRow[]> {
  const qs = buildQueryString({
    partnerId: params.partnerId,
    status: params.status,
  });
  return apiJson(`/nx04/partner-grade-history${qs}`);
}

export function getGradeHistory(id: string): Promise<PartnerGradeHistoryRow> {
  return apiJson(`/nx04/partner-grade-history/${encodeURIComponent(id)}`);
}

export function requestGradeChange(
  payload: CreateGradeChangeRequestPayload,
): Promise<PartnerGradeHistoryRow> {
  return apiJson(`/nx04/partner-grade-history/request`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function approveGradeChange(id: string): Promise<PartnerGradeHistoryRow> {
  return apiJson(`/nx04/partner-grade-history/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
  });
}

export function rejectGradeChange(
  id: string,
  payload: RejectGradeChangePayload,
): Promise<PartnerGradeHistoryRow> {
  return apiJson(`/nx04/partner-grade-history/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
