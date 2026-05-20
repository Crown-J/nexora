/**
 * File: apps/nx-ui/src/app/dashboard/base/users/page.tsx
 *
 * Purpose:
 * - 使用者主檔（路由 v2：`/dashboard/base/users`）
 * - 業界改革 #26 v1：PageHeader 與 toolbar 整合渲染在 BaseUserMasterView 內（actions prop）
 */

'use client';

import { BaseUserMasterView } from '@/features/base/users/BaseUserMasterView';

export default function BaseUsersPage() {
  return <BaseUserMasterView />;
}
