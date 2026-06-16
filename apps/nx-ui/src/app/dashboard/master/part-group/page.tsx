// apps/nx-ui/src/app/dashboard/master/part-group/page.tsx
/**
 * 零件群組主檔（鋼鐵星球範式、EntityMasterPage）
 * DashboardShell 已加 bypass（避免雙 shell）。
 */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { PART_GROUP_MASTER } from '@/features/nx01/shell/master-config/simple-masters';

export default function BasePartGroupDashboardPage() {
  return <EntityMasterPage config={PART_GROUP_MASTER} />;
}
