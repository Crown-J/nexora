/**
 * File: apps/nx-ui/src/app/dashboard/base/location/page.tsx
 * Purpose: 庫位主檔（路由 v2：`/dashboard/base/location`）
 */
'use client';
import { BaseLocationMasterView } from '@/features/base/warehouse-like/BaseWarehouseLikeMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
export default function BaseLocationDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="庫位主檔" />
      <BaseLocationMasterView />
    </div>
  );
}
