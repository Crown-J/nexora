/**
 * File: apps/nx-ui/src/app/dashboard/base/roles/page.tsx
 *
 * Purpose:
 * - 職務主檔（路由 v2：`/dashboard/base/roles`）
 */

'use client';

import { BaseRoleMasterView } from '@/features/base/role/BaseRoleMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BaseRolesPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="職務主檔" />
      <BaseRoleMasterView />
    </div>
  );
}
