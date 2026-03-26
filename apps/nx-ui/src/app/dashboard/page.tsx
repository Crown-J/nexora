/**
 * File: apps/nx-ui/src/app/dashboard/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Dashboard 根路徑：導向系統首頁 /home（NX00 主檔請用 /dashboard/nx00）
 *
 * Notes:
 * - 使用 Next.js redirect（Server Side）
 */

import { redirect } from 'next/navigation';

export default function DashboardRootPage() {
  redirect('/home');
}