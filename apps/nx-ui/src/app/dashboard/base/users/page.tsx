/**
 * File: apps/nx-ui/src/app/dashboard/base/users/page.tsx
 *
 * Purpose:
 * - 使用者主檔（路由 v2：`/dashboard/base/users`）
 */

'use client';

import { BaseUserMasterView } from '@/features/base/users/BaseUserMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BaseUsersPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="使用者主檔" />
      <BaseUserMasterView />
    </div>
  );
}
