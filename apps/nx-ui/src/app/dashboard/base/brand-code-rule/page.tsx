// apps/nx-ui/src/app/dashboard/base/brand-code-rule/page.tsx
/** brand-code-rule 主檔（鋼鐵星球範式、EntityMasterPage）；DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { BRAND_CODE_RULE_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={BRAND_CODE_RULE_MASTER} />;
}
