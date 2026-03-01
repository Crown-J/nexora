/**
 * File: apps/nx-ui/src/app/dashboard/nx00/user-role/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-ROLE-GROUP-ENTRY-001：UserRole Group Page Entry（路由入口）
 */

'use client';

import { UserRoleGroupView } from '@/features/nx00/user-role/ui/UserRoleGroupView';

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-ROLE-GROUP-ENTRY-001-F01
 * 說明：
 * - App Router page entry
 */
export default function UserRoleGroupPage() {
    return <UserRoleGroupView />;
}