/**
 * File: apps/nx-ui/src/app/dashboard/nx04/page.tsx
 *
 * Purpose:
 * - 路由 v2.0 redirect：/dashboard/nx04 → /dashboard/finance
 */

import { redirect } from 'next/navigation';

export default function Nx04RedirectPage() {
  redirect('/dashboard/finance');
}
