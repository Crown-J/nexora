/**
 * File: apps/nx-ui/src/app/dashboard/base/user-warehouse/page.tsx
 *
 * Purpose:
 * - 使用者據點設定（路由 v2：`/dashboard/base/user-warehouse`）
 */

'use client';

import { BaseUserWarehouseView } from '@/features/base/user-warehouse/BaseUserWarehouseView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BaseUserWarehouseDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="使用者據點設定" />
      <BaseUserWarehouseView />
    </div>
  );
}
