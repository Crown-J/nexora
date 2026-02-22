/**
 * File: apps/nx-ui/src/app/dashboard/layout.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-006：Dashboard Layout（統一套用 Shell 版面）
 *
 * Notes:
 * - Dashboard 下所有頁面都會套用：Top Tabs + Side Menu + Content Frame
 * - ✅ App Router 的 layout 預設是 Server Component：
 *   - 不要加 'use client'（避免整個 dashboard 變成 client boundary）
 * - ✅ 在 layout 內不要用 usePathname / hooks
 *   - 改用 Segment/Path 由 client component（DashboardShell）自己判斷
 *   - 或者在這裡單純包殼，把右側 title 交給 children/page 自己提供（之後可做 config/breadcrumb）
 */

import type { ReactNode } from 'react';
import { DashboardShell } from '@/features/layout/ui/DashboardShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}