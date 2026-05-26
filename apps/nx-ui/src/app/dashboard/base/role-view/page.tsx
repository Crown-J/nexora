// apps/nx-ui/src/app/dashboard/base/role-view/page.tsx
/** 職務權限視圖主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/master-shell/entity-master/EntityMasterPage';
import { ROLE_VIEW_MASTER } from '@/features/base/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={ROLE_VIEW_MASTER} />;
}
