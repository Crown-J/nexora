// apps/nx-ui/src/app/dashboard/master/department/page.tsx
// L0 inline edit row 範本（執行長 2026-06-23 分級第一波）
'use client';

import { InlineEditMasterPage } from '@/features/nx01/shell/inline-master';
import { DEPARTMENT_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <InlineEditMasterPage config={DEPARTMENT_MASTER} />;
}
