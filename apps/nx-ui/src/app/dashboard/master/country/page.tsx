// apps/nx-ui/src/app/dashboard/master/country/page.tsx
/**
 * 國家主檔（L0 inline edit row 範本、執行長 2026-06-23 分級拍板第一波 pilot）
 * 3 欄字典表、不切 list/detail Tab、雙擊或 Enter 直接 inline 編輯。
 */
'use client';

import { InlineEditMasterPage } from '@/features/nx01/shell/inline-master';
import { COUNTRY_MASTER } from '@/features/nx01/shell/master-config/simple-masters';

export default function BaseCountryDashboardPage() {
  return <InlineEditMasterPage config={COUNTRY_MASTER} />;
}
