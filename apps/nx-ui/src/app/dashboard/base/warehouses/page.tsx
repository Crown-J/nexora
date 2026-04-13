/**
 * File: apps/nx-ui/src/app/dashboard/base/warehouses/page.tsx
 *
 * Purpose:
 * - 倉庫主檔（路由 v2：`/dashboard/base/warehouses`）
 */

'use client';

import { BaseWarehouseMasterView } from '@/features/base/warehouse-like/BaseWarehouseLikeMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BaseWarehousesPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="倉庫主檔" />
      <BaseWarehouseMasterView />
    </div>
  );
}
