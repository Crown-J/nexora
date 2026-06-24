// apps/nx-ui/src/app/dashboard/master/country/page.tsx
// 國家主檔（執行長 2026-06-24 推翻卡片式、統一回 EntityMasterPage）
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { COUNTRY_MASTER } from '@/features/nx01/shell/master-config/simple-masters';

export default function BaseCountryDashboardPage() {
  return <EntityMasterPage config={COUNTRY_MASTER} />;
}
