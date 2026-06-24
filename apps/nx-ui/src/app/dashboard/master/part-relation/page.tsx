// apps/nx-ui/src/app/dashboard/master/part-relation/page.tsx
/** part-relation 主檔（執行長 2026-06-24 推翻卡片式、統一回 EntityMasterPage） */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { PART_RELATION_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={PART_RELATION_MASTER} />;
}
