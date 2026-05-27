// apps/nx-ui/src/app/dashboard/base/engine/page.tsx
/** engine 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/master-shell/entity-master/EntityMasterPage';
import { ENGINE_MASTER } from '@/features/base/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={ENGINE_MASTER} />;
}
