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

// ── 席次制（2026-06-03、Crown 拍板）：精靈第二步「挑啟用」API client ──

export type SeatUsage = {
  /** 已啟用使用者數（含負責人） */
  used: number;
  /** 訂閱席次上限 */
  total: number;
  /** 剩餘可啟用席次（=total-used、最小 0） */
  available: number;
};

export type PendingUserRow = {
  id: string;
  username: string; // 員工編號
  displayName: string;
  email: string | null;
  jobTitle: string | null;
};

type UserListResponse = {
  rows?: Array<{
    id: string;
    username?: string;
    displayName?: string;
    email?: string | null;
    jobTitle?: string | null;
    isActive?: boolean;
  }>;
  total?: number;
};

/** 拉「目前未啟用」員工清單（精靈挑啟用用）
 *  pageSize 上限 100（Nx01ListQueryDto.@Max(100)、避免 ValidationPipe 拒絕）。
 *  LITE 客戶 seats 上限 10、未啟用員工正常情境一頁夠用。
 */
export async function fetchPendingEmployees(): Promise<PendingUserRow[]> {
  const res = await apiJson<UserListResponse>('/nx01/users?isActive=false&pageSize=100', {
    method: 'GET',
  });
  return (res.rows ?? []).map((r) => ({
    id: r.id,
    username: r.username ?? '',
    displayName: r.displayName ?? r.username ?? '',
    email: r.email ?? null,
    jobTitle: r.jobTitle ?? null,
  }));
}

/** 拉席次使用情況（已用 X / 總 Y） */
export function fetchSeatUsage(): Promise<SeatUsage> {
  return apiJson<SeatUsage>('/nx01/users/seat-usage', { method: 'GET' });
}

/** 批次啟用（後端會 SE-001 / SE-002 守門） */
export function bulkActivateUsers(userIds: string[]): Promise<{ activated: number; seatUsage: SeatUsage }> {
  return apiJson('/nx01/users/bulk-activate', {
    method: 'PUT',
    body: JSON.stringify({ userIds }),
  });
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
