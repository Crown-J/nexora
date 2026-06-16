// apps/nx-ui/src/app/dashboard/base/department/page.tsx
// 05 批 T1 2026-06-07：部門主檔（從 /dashboard/nx07/department placeholder 升級成通用 EntityMasterPage）
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { DEPARTMENT_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={DEPARTMENT_MASTER} />;
}
