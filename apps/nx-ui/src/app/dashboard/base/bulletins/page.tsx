// apps/nx-ui/src/app/dashboard/base/bulletins/page.tsx
/** bulletins 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/master-shell/entity-master/EntityMasterPage';
import { BULLETIN_MASTER } from '@/features/base/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={BULLETIN_MASTER} />;
}
