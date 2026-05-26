// apps/nx-ui/src/app/dashboard/base/transmission/page.tsx
/** transmission 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/master-shell/entity-master/EntityMasterPage';
import { TRANSMISSION_MASTER } from '@/features/base/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={TRANSMISSION_MASTER} />;
}
