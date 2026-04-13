/**
 * File: apps/nx-ui/src/app/dashboard/base/role-view/page.tsx
 *
 * Purpose:
 * - 職務權限設定（路由 v2：`/dashboard/base/role-view`）
 */

'use client';

import { BaseRoleViewSplitView } from '@/features/base/role-view/BaseRoleViewSplitView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BaseRoleViewDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader
        title="職務權限設定（Role ⇄ View）"
        description="依職務（角色）設定各畫面的讀寫與啟用狀態。"
      />
      <BaseRoleViewSplitView />
    </div>
  );
}
