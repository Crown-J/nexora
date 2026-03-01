/**
 * File: apps/nx-ui/src/app/dashboard/nx00/role/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-SPLIT-ENTRY-001：Role Split Page Entry（路由入口）
 *
 * Notes:
 * - 本檔案只負責匯入並渲染 RoleSplitView（避免 page.tsx 變肥）
 */

'use client';

import { RoleSplitView } from '@/features/nx00/role/ui/RoleSplitView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-SPLIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 * - UI/logic 已抽到 features/nx00/role
 */
export default function RoleSplitPage() {
    return <RoleSplitView />;
}