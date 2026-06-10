/**
 * File: apps/nx-ui/src/app/dashboard/nx01/page.tsx
 *
 * Purpose:
 * - TASK-0420 v2 redirect：/dashboard/nx01 → 採購工作台
 */

import { redirect } from 'next/navigation';

export default function Nx01RedirectPage() {
  redirect('/dashboard/purchase/domestic');
}
