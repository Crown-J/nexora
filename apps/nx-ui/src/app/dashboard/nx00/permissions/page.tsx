/**
 * File: apps/nx-ui/src/app/dashboard/nx00/permissions/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PERM-SPLIT-ENTRY-001：Permissions Split Page Entry（路由入口）
 *
 * Notes:
 * - 本檔案只負責匯入並渲染 PermissionsSplitView（避免 page.tsx 變肥）
 */

'use client';

import { PermissionsSplitView } from '@/features/nx00/permissions/ui/PermissionsSplitView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-PERM-SPLIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 * - UI/logic 已抽到 features/nx00/permissions
 */
export default function PermissionsSplitPage() {
    return <PermissionsSplitView />;
}