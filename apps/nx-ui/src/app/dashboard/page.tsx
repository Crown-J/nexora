/**
 * File: apps/nx-ui/src/app/dashboard/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Dashboard 根路徑：導入 Shell 內預設模組（避免再跳到舊版 /home Landing）
 *
 * Notes:
 * - 使用 Next.js redirect（Server Side）
 * - 舊版入口畫面仍保留於 /home、/base（Dock「首頁」連結）
 */

import { redirect } from 'next/navigation';

export default function DashboardRootPage() {
  redirect('/dashboard/nx00');
}