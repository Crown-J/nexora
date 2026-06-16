// apps/nx-ui/src/app/dashboard/base/model-type/page.tsx
/** model-type 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { MODEL_TYPE_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={MODEL_TYPE_MASTER} />;
}
