// apps/nx-ui/src/app/dashboard/master/currency/page.tsx
/**
 * 幣別主檔（執行長 2026-06-24 推翻卡片式、統一回 EntityMasterPage）
 * DashboardShell 已加 bypass。
 */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { CURRENCY_MASTER } from '@/features/nx01/shell/master-config/simple-masters';

export default function BaseCurrencyDashboardPage() {
  return <EntityMasterPage config={CURRENCY_MASTER} />;
}
