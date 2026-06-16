// apps/nx-ui/src/app/dashboard/master/transmission/page.tsx
/** transmission 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { TRANSMISSION_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={TRANSMISSION_MASTER} />;
}
