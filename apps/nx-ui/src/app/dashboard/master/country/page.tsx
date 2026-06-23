// apps/nx-ui/src/app/dashboard/master/country/page.tsx
/**
 * 國家主檔（L0 卡片式 + 全鍵盤範本、執行長 2026-06-23 第二代拍板 pilot）
 * inline row 範式淘汰、改走遊戲化卡片：↑↓←→ 移、Enter 編輯、N 新增、? 看熱鍵。
 */
'use client';

import { KeyboardCardMasterPage } from '@/features/nx01/shell/keyboard-card-master';
import { COUNTRY_MASTER } from '@/features/nx01/shell/master-config/simple-masters';

export default function BaseCountryDashboardPage() {
  return <KeyboardCardMasterPage config={COUNTRY_MASTER} />;
}
