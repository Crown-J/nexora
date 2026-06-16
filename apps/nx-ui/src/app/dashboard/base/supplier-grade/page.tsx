// apps/nx-ui/src/app/dashboard/base/supplier-grade/page.tsx
// 05 批 T4 2026-06-07：供應商分級半開放主檔頁（通用 EntityMasterPage 範式）
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { SUPPLIER_GRADE_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={SUPPLIER_GRADE_MASTER} />;
}
