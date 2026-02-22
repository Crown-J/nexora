/**
 * File: apps/nx-ui/src/app/dashboard/nx00/roles/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-ENTRY-001：RBAC Roles（角色/成員管理）路由入口
 *
 * Notes:
 * - 本頁只負責 render RoleUserAssignView（避免 page.tsx 變肥）
 * - 版面外框由 dashboard layout / DashboardShell 提供
 */

'use client';

import { RoleUserAssignView } from '@/features/nx00/rbac/ui/RoleUserAssignView';

/**
 * @FUNCTION_CODE NX00-RBAC-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 * - UI/logic 已抽到 features/nx00/rbac
 */
export default function RolesPage() {
  return <RoleUserAssignView />;
}