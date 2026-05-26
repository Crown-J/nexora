// apps/nx-ui/src/app/dashboard/base/country/page.tsx
/**
 * 國家主檔（鋼鐵星球範式、EntityMasterPage）
 * DashboardShell 已加 bypass（避免雙 shell）。
 */
'use client';

import { EntityMasterPage } from '@/features/master-shell/entity-master/EntityMasterPage';
import { COUNTRY_MASTER } from '@/features/base/master-config/simple-masters';

export default function BaseCountryDashboardPage() {
  return <EntityMasterPage config={COUNTRY_MASTER} />;
}
