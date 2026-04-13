/**
 * File: apps/nx-ui/src/app/base/page.tsx
 *
 * Purpose:
 * - 路由 v2.0 redirect：/base → /dashboard/base
 */

import { redirect } from 'next/navigation';

export default function BaseRedirectPage() {
  redirect('/dashboard/base');
}
