// apps/nx-ui/src/app/dashboard/master/department/page.tsx
// 部門主檔（執行長 2026-06-24 推翻卡片式、統一回 EntityMasterPage）
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { DEPARTMENT_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={DEPARTMENT_MASTER} />;
}
