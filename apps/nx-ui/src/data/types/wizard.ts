// apps/nx-ui/src/features/wizard/types.ts
//
// 2026-06-04 客戶端拆匯入精靈軌：
//   - 刪 ImportBatch / IMPORT_TYPES（孤兒、隨匯入精靈整套移除）
//   - 留 WizardStatus（getWizardStatus return type）
//     · importWizardCompleted 客戶端不再消費、平台後台 / 後端寫入仍存在
//     · seenPages 頁面引導用、保留

export interface WizardStatus {
  importWizardCompleted: boolean;
  importWizardCompletedAt: string | null;
  seenPages: { pageKey: string; seenAt: string }[];
}
