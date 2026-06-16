// apps/nx-ui/src/app/dashboard/base/currency/page.tsx
/**
 * 幣別主檔（鋼鐵星球範式、EntityMasterPage）
 * DashboardShell 已加 bypass（避免雙 shell）。
 */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { CURRENCY_MASTER } from '@/features/nx01/shell/master-config/simple-masters';

export default function BaseCurrencyDashboardPage() {
  return <EntityMasterPage config={CURRENCY_MASTER} />;
}
