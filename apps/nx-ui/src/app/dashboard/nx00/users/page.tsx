/**
 * File: apps/nx-ui/src/app/dashboard/nx00/users/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-LIST-ENTRY-001：Users List Page Entry（路由入口）
 *
 * Notes:
 * - 本檔案只負責匯入並渲染 UsersListView（避免 page.tsx 變肥）
 */

'use client';

import { UsersListView } from '@/features/nx00/users/ui/UsersListView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 * - UI/logic 已抽到 features/nx00/users
 */
export default function UsersListPage() {
  return <UsersListView />;
}