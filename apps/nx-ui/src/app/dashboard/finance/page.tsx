/**
 * File: apps/nx-ui/src/app/dashboard/finance/page.tsx
 *
 * Purpose:
 * - 財務模組首頁（路由 v2：`/dashboard/finance`）→ 轉至財務工作台
 */

import { redirect } from 'next/navigation';

export default function FinanceModulePage() {
  redirect('/dashboard/finance/workspace');
}
