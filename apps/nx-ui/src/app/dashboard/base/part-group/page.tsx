/**
 * File: apps/nx-ui/src/app/dashboard/base/part-group/page.tsx
 * Purpose: 零件族群主檔（路由 v2：`/dashboard/base/part-group`）
 */
'use client';
import { BasePartGroupApiMasterView } from '@/features/base/part-group/BasePartGroupApiMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
export default function BasePartGroupDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="零件族群主檔" />
      <BasePartGroupApiMasterView />
    </div>
  );
}
