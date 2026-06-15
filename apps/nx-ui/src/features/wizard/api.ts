// apps/nx-ui/src/features/wizard/api.ts
//
// 2026-06-04 客戶端拆匯入精靈軌：
//   - 刪掉匯入精靈專用 export（completeImportWizard / resetImportWizard / listImportHistory /
//     downloadTemplate / previewImport / confirmImport / PreviewResult / ConfirmResult）
//   - 刪掉精靈內挑啟用專用（fetchPendingEmployees / bulkActivateUsers / PendingUserRow）
//   - 保留：頁面引導用（getWizardStatus / markPageSeen / resetMyPageGuides）
//           + 席次用（fetchSeatUsage / SeatUsage、給主檔 UserZonedPage 段 4 徽章）
//   - features/wizard/ 命名空間本軌只刪、不重命名（命名債日後另開軌清）

import { apiJson } from '@data/api/client';

import type { WizardStatus } from './types';

/** 頁面引導：拉 user 狀態（含 seenPages、importWizardCompleted 仍存在但客戶端不再消費）*/
export function getWizardStatus(): Promise<WizardStatus> {
  return apiJson('/wizard/status');
}

/** 頁面引導：標某頁已看過 */
export function markPageSeen(pageKey: string): Promise<{ ok: true }> {
  return apiJson(`/wizard/page/${encodeURIComponent(pageKey)}/seen`, {
    method: 'POST',
    body: JSON.stringify({ pageKey }),
  });
}

/** 頁面引導：重置我的所有 seenPages */
export function resetMyPageGuides(): Promise<{ ok: true }> {
  return apiJson('/wizard/page/reset-mine', { method: 'POST' });
}

// ── 席次（給主檔員工頁段 4 徽章顯示用、保留）──────────────────────────

export type SeatUsage = {
  /** 已啟用使用者數（含負責人） */
  used: number;
  /** 訂閱席次上限 */
  total: number;
  /** 剩餘可啟用席次（=total-used、最小 0） */
  available: number;
};

/** 拉席次使用情況（已用 X / 總 Y、UserZonedPage 工具列徽章用）*/
export function fetchSeatUsage(): Promise<SeatUsage> {
  return apiJson<SeatUsage>('/nx01/users/seat-usage', { method: 'GET' });
}
