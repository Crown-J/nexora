// apps/nx-ui/src/app/dashboard/base/part-compat-group/page.tsx
// 02 對齊第二批 C 軌 CP2-c 2026-06-06：通用件群組主檔頁（member 子表 UI 後續軌補）
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { PART_COMPAT_GROUP_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={PART_COMPAT_GROUP_MASTER} />;
}
