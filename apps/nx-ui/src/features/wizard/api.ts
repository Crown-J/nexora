// apps/nx-ui/src/features/wizard/api.ts
import { apiJson } from '@/shared/api/client';

import type { ImportBatch, WizardStatus } from './types';

export function getWizardStatus(): Promise<WizardStatus> {
  return apiJson('/wizard/status');
}

export function completeImportWizard(): Promise<{ ok: true }> {
  return apiJson('/wizard/import/complete', { method: 'POST' });
}

export function resetImportWizard(): Promise<{ ok: true }> {
  return apiJson('/wizard/import/reset', { method: 'POST' });
}

export function markPageSeen(pageKey: string): Promise<{ ok: true }> {
  return apiJson(`/wizard/page/${encodeURIComponent(pageKey)}/seen`, {
    method: 'POST',
    body: JSON.stringify({ pageKey }),
  });
}

export function resetMyPageGuides(): Promise<{ ok: true }> {
  return apiJson('/wizard/page/reset-mine', { method: 'POST' });
}

export function listImportHistory(): Promise<ImportBatch[]> {
  return apiJson('/wizard/import/history');
}
