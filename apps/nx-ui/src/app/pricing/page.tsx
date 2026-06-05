// apps/nx-ui/src/app/pricing/page.tsx
/**
 * [4-2] 2026-06-05：NX-MANUAL-02 v2.0 §④ 對齊：
 * 系統內不出現「升級／加購／聯絡業務」推銷文案、方案對比頁停止對客戶提供。
 *
 * 原本由 UpgradePromptDialog「了解升級方案」按鈕 navigate 至此頁、
 * UpgradePromptDialog 已於 [1-1] 移除、此路由不再有 in-app caller。
 * 訪問 /pricing 自動 redirect 回首頁。
 *
 * 內部演示 / 業務窗口接洽改由 app 外的官網 / DM 處理、不在系統範圍。
 */

import { redirect } from 'next/navigation';

export default function PricingPage(): never {
  redirect('/dashboard');
}
