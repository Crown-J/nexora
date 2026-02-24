/**
 * File: apps/nx-ui/src/app/dashboard/nx00/users/new/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-REDIRECT-NEW-001：舊 /new 路由相容（redirect）
 *
 * Notes:
 * - 舊路由：/dashboard/nx00/users/new
 * - 新路由：/dashboard/nx00/users?mode=new
 */

import { redirect } from 'next/navigation';

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-REDIRECT-NEW-001-F01
 * 說明：
 * - redirect 舊 /new → ?mode=new
 */
export default function UsersNewRedirectPage() {
  redirect('/dashboard/nx00/users?mode=new');
}