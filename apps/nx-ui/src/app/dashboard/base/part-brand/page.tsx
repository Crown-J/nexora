/**
 * File: apps/nx-ui/src/app/dashboard/base/part-brand/page.tsx
 * Purpose: 零件廠牌主檔（路由 v2：`/dashboard/base/part-brand`）
 */
'use client';
import { BasePartBrandMasterView } from '@/features/base/brand-like/BaseBrandLikeMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
export default function BasePartBrandDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="零件廠牌主檔" />
      <BasePartBrandMasterView />
    </div>
  );
}
