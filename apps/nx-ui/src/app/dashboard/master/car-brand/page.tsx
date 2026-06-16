// apps/nx-ui/src/app/dashboard/master/car-brand/page.tsx
/** car-brand 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { CAR_BRAND_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={CAR_BRAND_MASTER} />;
}
