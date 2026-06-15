// apps/nx-ui/src/features/shared/issue-report-trigger/api.ts
// NX04-M3 C6：問題回報 API client（POST /nx04/issue-report）

import { apiJson } from '@data/api/client';

import type { CreateIssueReportPayload } from '@data/types/shared/issue-report-trigger';

export function createIssueReport(payload: CreateIssueReportPayload): Promise<{ id: string }> {
  return apiJson(`/nx04/issue-report`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
