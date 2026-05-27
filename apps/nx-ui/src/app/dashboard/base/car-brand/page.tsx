// apps/nx-ui/src/app/dashboard/base/car-brand/page.tsx
/** car-brand 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/master-shell/entity-master/EntityMasterPage';
import { CAR_BRAND_MASTER } from '@/features/base/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={CAR_BRAND_MASTER} />;
}
