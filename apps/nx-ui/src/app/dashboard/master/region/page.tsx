// apps/nx-ui/src/app/dashboard/master/region/page.tsx
// 02 對齊第二批 C 軌 CP1 2026-06-06：地區主檔頁
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { REGION_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={REGION_MASTER} />;
}
