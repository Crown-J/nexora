// apps/nx-ui/src/app/dashboard/base/drivetrain/page.tsx
/** drivetrain 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/master-shell/entity-master/EntityMasterPage';
import { DRIVETRAIN_MASTER } from '@/features/base/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={DRIVETRAIN_MASTER} />;
}
