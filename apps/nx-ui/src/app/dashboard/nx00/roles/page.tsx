/**
 * File: apps/nx-ui/src/app/dashboard/nx00/roles/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLES-SPLIT-ENTRY-001：Roles Split Page Entry（路由入口）
 *
 * Notes:
 * - 本檔案只負責匯入並渲染 RolesSplitView（避免 page.tsx 變肥）
 */

'use client';

import { RolesSplitView } from '@/features/nx00/roles/ui/RolesSplitView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLES-SPLIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 * - UI/logic 已抽到 features/nx00/roles
 */
export default function RolesSplitPage() {
  return <RolesSplitView />;
}