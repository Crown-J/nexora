/**
 * File: apps/nx-ui/src/app/dashboard/base/part-relation/page.tsx
 * Purpose: 零件關聯（路由 v2：`/dashboard/base/part-relation`）
 */
'use client';
import { BasePartRelationMasterView } from '@/features/base/part-relation/BasePartRelationMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
export default function BasePartRelationDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader
        title="零件關聯"
        description="nx00_part_relation。列表顯示料號／品名；維護時請輸入來源／目的零件內碼。"
      />
      <BasePartRelationMasterView />
    </div>
  );
}
