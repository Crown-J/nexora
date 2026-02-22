/**
 * File: apps/nx-ui/src/app/dashboard/nx00/users/[id]/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-EDIT-ENTRY-001：User Edit Page Entry（路由入口）
 *
 * Notes:
 * - 本檔案只負責 render UserEditView（避免 page.tsx 變肥）
 */

'use client';

import { UserEditView } from '@/features/nx00/users/ui/UserEditView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 * - UI/logic 已抽到 features/nx00/users
 */
export default function UserEditPage() {
  return <UserEditView />;
}