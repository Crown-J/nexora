// apps/nx-ui/src/app/dashboard/base/partners/page.tsx
/** 往來對象主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/master-shell/entity-master/EntityMasterPage';
import { PARTNER_MASTER } from '@/features/base/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={PARTNER_MASTER} />;
}
