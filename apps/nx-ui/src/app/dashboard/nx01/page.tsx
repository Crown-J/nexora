/**
 * File: apps/nx-ui/src/app/dashboard/nx01/page.tsx
 *
 * Purpose:
 * - 路由 v2.0 redirect：/dashboard/nx01 → /dashboard/purchase
 */

import { redirect } from 'next/navigation';

export default function Nx01RedirectPage() {
  redirect('/dashboard/purchase');
}
