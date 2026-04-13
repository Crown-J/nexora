/**
 * File: apps/nx-ui/src/app/dashboard/base/country/page.tsx
 * Purpose: 國家主檔（路由 v2：`/dashboard/base/country`）
 */
'use client';
import { BaseCountryMasterView } from '@/features/base/country/BaseCountryMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
export default function BaseCountryDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="國家主檔" />
      <BaseCountryMasterView />
    </div>
  );
}
