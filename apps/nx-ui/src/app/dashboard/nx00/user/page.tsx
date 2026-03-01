/**
 * File: apps/nx-ui/src/app/dashboard/nx00/user/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-SPLIT-ENTRY-001：User Split Page Entry（路由入口）
 *
 * Notes:
 * - 本檔案只負責匯入並渲染 UserSplitView（避免 page.tsx 變肥）
 */

'use client';

import { UserSplitView } from '@/features/nx00/user/ui/UserSplitView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-SPLIT-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 * - UI/logic 已抽到 features/nx00/user
 */
export default function UserSplitPage() {
    return <UserSplitView />;
}