/**
 * File: apps/nx-ui/src/app/dashboard/base/user-role/page.tsx
 *
 * Purpose:
 * - 使用者職務設定（路由 v2：`/dashboard/base/user-role`）
 */

'use client';

import { BaseUserRoleView } from '@/features/base/user-role/BaseUserRoleView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BaseUserRoleDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="使用者職務設定" />
      <BaseUserRoleView />
    </div>
  );
}
