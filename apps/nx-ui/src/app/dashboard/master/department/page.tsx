// apps/nx-ui/src/app/dashboard/master/department/page.tsx
// 部門主檔（通用 EntityMasterPage 範式）
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { DEPARTMENT_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={DEPARTMENT_MASTER} />;
}
