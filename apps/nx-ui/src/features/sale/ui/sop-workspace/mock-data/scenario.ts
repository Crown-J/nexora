// apps/nx-ui/src/features/sale/ui/sop-workspace/mock-data/scenario.ts
/**
 * 國內銷貨 SOP 手機工作台情境與 9 步 meta。
 */

import type { StepMeta } from '../types';

export const TAX_RATE = 0.05;

/** 目標毛利率門檻（對應客戶等級），STEP 3 達標顯示 ✅ */
export const TIER_TARGET_MARGIN: Record<'A' | 'B' | 'C' | 'D', number> = {
  A: 32,
  B: 27,
  C: 22,
  D: 17,
};

export const STEPS_META: readonly StepMeta[] = [
  { id: 1, shortLabel: '客戶', title: '選擇客戶', subtitle: '選擇您今天要拜訪的客戶' },
  { id: 2, shortLabel: '查料', title: '查料號 / 庫存', subtitle: '輸入料號當場查庫存與建議售價' },
  { id: 3, shortLabel: '報價', title: '確認報價清單', subtitle: '核對清單後口頭告知客戶' },
  { id: 4, shortLabel: '方式', title: '如何給客戶報價？', subtitle: '業界慣例是口頭報，特殊情況才給書面' },
  { id: 5, shortLabel: '決定', title: '客戶確認訂單', subtitle: '客戶回應後，進入下一步建立訂單' },
  { id: 6, shortLabel: '配送', title: '配送方式', subtitle: '依客戶類型推薦最適合的方式' },
  { id: 7, shortLabel: '簽單', title: '簽單方式', subtitle: '現場請客戶確認訂單' },
  { id: 8, shortLabel: '成立', title: '訂單成立', subtitle: '系統已自動同步庫存、AR、業績' },
  { id: 9, shortLabel: '完成', title: '成交！', subtitle: '恭喜業務完成一單' },
];

/** STEP 8 固定顯示的 mock 訂單 / 撿貨單 / 配送 ETA */
export const MOCK_SO_NO = 'SO-202604-00056';
export const MOCK_PK_NO = 'PK-202604-00089';
export const MOCK_DELIVERY_ETA_MIN = 30;
