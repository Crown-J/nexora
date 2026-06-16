// apps/nx-ui/src/app/dashboard/base/team/page.tsx
// 05 批 T2 2026-06-07：組主檔頁（揭露既有 Nx01Team、通用 EntityMasterPage 範式）
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { TEAM_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={TEAM_MASTER} />;
}
