// apps/nx-ui/src/app/dashboard/master/engine/page.tsx
/** engine 主檔（執行長 2026-06-24 推翻卡片式、統一回 EntityMasterPage） */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { ENGINE_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={ENGINE_MASTER} />;
}
