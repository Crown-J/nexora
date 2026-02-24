/**
 * File: apps/nx-ui/src/app/dashboard/nx00/users/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-SPLIT-ENTRY-001：Users Split Page Entry（路由入口）
 *
 * Notes:
 * - 單一路由入口：/dashboard/nx00/users
 * - 右側狀態以 query 表達：
 *   - ?mode=new → 新增
 *   - ?id=<uuid> → 編輯
 */

'use client';

import { UsersSplitView } from '@/features/nx00/users/ui/UsersSplitView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 * - render UsersSplitView（避免 page.tsx 變肥）
 */
export default function UsersSplitPage() {
  return <UsersSplitView />;
}