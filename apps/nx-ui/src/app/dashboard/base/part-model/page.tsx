// apps/nx-ui/src/app/dashboard/base/part-model/page.tsx
/** part-model 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/master-shell/entity-master/EntityMasterPage';
import { PART_MODEL_MASTER } from '@/features/base/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={PART_MODEL_MASTER} />;
}
