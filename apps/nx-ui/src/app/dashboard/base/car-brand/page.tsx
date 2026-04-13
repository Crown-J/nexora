/**
 * File: apps/nx-ui/src/app/dashboard/base/car-brand/page.tsx
 * Purpose: 汽車廠牌主檔（路由 v2：`/dashboard/base/car-brand`）
 */
'use client';
import { BaseCarBrandMasterView } from '@/features/base/brand-like/BaseBrandLikeMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
export default function BaseCarBrandDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="汽車廠牌主檔" />
      <BaseCarBrandMasterView />
    </div>
  );
}
