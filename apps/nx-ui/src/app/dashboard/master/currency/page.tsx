// apps/nx-ui/src/app/dashboard/master/currency/page.tsx
/**
 * 幣別主檔（L1 首發試 v2 卡片+全鍵盤範本、執行長 2026-06-24 拍板）
 * 5 欄（code / name / symbol / decimalPlaces / sortNo[inList=false]）、列表顯 4 欄
 * 觀察 head/sub + tail 2 個欄是否塞得下、detail 浮層補齊。
 */
'use client';

import { KeyboardCardMasterPage } from '@/features/nx01/shell/keyboard-card-master';
import { CURRENCY_MASTER } from '@/features/nx01/shell/master-config/simple-masters';

export default function BaseCurrencyDashboardPage() {
  return <KeyboardCardMasterPage config={CURRENCY_MASTER} />;
}
