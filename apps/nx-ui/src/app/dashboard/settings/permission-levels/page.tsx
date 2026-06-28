// apps/nx-ui/src/app/dashboard/settings/permission-levels/page.tsx
// 職務↔權限拆分軌 Step5：權限等級主頁（通用主檔模板 EntityMasterPage，與使用者基本資料同款）

'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { PERMISSION_LEVEL_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function PermissionLevelsPage() {
  return <EntityMasterPage config={PERMISSION_LEVEL_MASTER} />;
}
