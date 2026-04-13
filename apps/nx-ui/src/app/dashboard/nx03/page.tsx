/**
 * File: apps/nx-ui/src/app/dashboard/nx03/page.tsx
 *
 * Purpose:
 * - 路由 v2.0 redirect：/dashboard/nx03 → /dashboard/sales
 */

import { redirect } from 'next/navigation';

export default function Nx03RedirectPage() {
  redirect('/dashboard/sales');
}
