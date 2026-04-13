/**
 * File: apps/nx-ui/src/app/dashboard/sales/page.tsx
 *
 * Purpose:
 * - 銷售模組首頁（路由 v2：`/dashboard/sales`）→ 轉至國內銷售工作台
 */

import { redirect } from 'next/navigation';

export default function SalesModulePage() {
  redirect('/dashboard/sales/domestic');
}
