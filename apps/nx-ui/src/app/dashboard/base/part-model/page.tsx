/**
 * File: apps/nx-ui/src/app/dashboard/base/part-model/page.tsx
 * Purpose: 料件車型適配（路由：`/dashboard/base/part-model`、戰略表 ⭐⭐）
 * 對應規格：docs/nx01/spec/intent/nx01-16-part-model.md v1.0
 */
'use client';
import { BasePartModelMasterView } from '@/features/base/part-model/BasePartModelMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BasePartModelDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader
        title="料件車型適配"
        description="nx01_part_model。料件 ↔ 車型適配關聯、附適配等級（原廠／副廠等效／通用替代）。"
      />
      <BasePartModelMasterView />
    </div>
  );
}
