// apps/nx-ui/src/features/wizard/api.ts
import { apiJson } from '@/shared/api/client';

import type { ImportBatch, WizardStatus } from './types';

export interface PreviewResult {
  importType: string;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: { rowNo: number; reason: string }[];
  batchId: string;
  sampleData: Record<string, string>[];
}

export interface ConfirmResult {
  ok: true;
  imported: number;
  historicalCount: number;
  errors: { rowNo: number; reason: string }[];
}

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

/// 下載 Excel 範本：fetch 帶 JWT、blob 觸發瀏覽器下載
/// 原本用 window.open 直接開連結、沒帶 Authorization → 後端 401
export async function downloadTemplate(importType: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';
  const token = (await import('@/features/auth/token')).getToken();
  const res = await fetch(`${baseUrl}/importer/template/${encodeURIComponent(importType)}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`下載範本失敗（HTTP ${res.status}）${body ? `\n${body}` : ''}`);
  }
  // 從 Content-Disposition 取檔名（後端 encodeURIComponent 後 attach、前端 decode）
  const cd = res.headers.get('Content-Disposition') ?? '';
  let filename = `${importType}.xlsx`;
  const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
  if (m && m[1]) {
    try {
      filename = decodeURIComponent(m[1]);
    } catch {
      // 保留 fallback filename
    }
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/// 上傳檔案 → 預覽
export async function previewImport(
  importType: string,
  file: File,
): Promise<PreviewResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';
  const fd = new FormData();
  fd.append('file', file);
  const token = (await import('@/features/auth/token')).getToken();
  const res = await fetch(`${baseUrl}/importer/preview/${encodeURIComponent(importType)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  if (!res.ok) throw new Error(`預覽失敗（${res.status}）`);
  return (await res.json()) as PreviewResult;
}

/// 確認匯入（cached file、不用 client 再傳檔）
export function confirmImport(batchId: string): Promise<ConfirmResult> {
  return apiJson(`/importer/confirm/${encodeURIComponent(batchId)}`, {
    method: 'POST',
  });
}
