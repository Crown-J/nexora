/**
 * File: apps/nx-ui/src/app/dashboard/nx00/users/new/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-CREATE-ENTRY-001：User Create Page Entry（路由入口）
 */

'use client';

import { UserCreateView } from '@/features/nx00/users/ui/UserCreateView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-CREATE-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 * - UI/logic 已抽到 features/nx00/users
 */
export default function UserCreatePage() {
  return <UserCreateView />;
}