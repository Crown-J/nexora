/**
 * File: apps/nx-ui/src/app/dashboard/layout.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-006：Dashboard Layout（統一套用 Shell 版面）
 *
 * Notes:
 * - Dashboard 下所有頁面都會套用：Top Tabs + Side Menu + Content Frame
 */

'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardShell } from '@/features/shell/ui/DashboardShell';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';

/**
 * @FUNCTION_CODE NX00-UI-SHELL-006-F01
 * 說明：
 * - 依路徑提供右側標題（先簡單做，之後可接 breadcrumb/config）
 */
function getTitleByPath(pathname: string): string {
  if (pathname === '/dashboard') return 'HOME';
  if (pathname.startsWith('/dashboard/nx00/users')) return 'NX00 / 使用者基本資料';
  if (pathname.startsWith('/dashboard/nx00/parts')) return 'NX00 / 零件主檔';
  if (pathname.startsWith('/dashboard/nx01')) return 'NX01 / 採購與進貨管理';
  if (pathname.startsWith('/dashboard/nx02')) return 'NX02 / 庫存管理';
  if (pathname.startsWith('/dashboard/nx03')) return 'NX03 / 銷售管理';
  if (pathname.startsWith('/dashboard/nx04')) return 'NX04 / 報表分析';
  return 'NEXORA';
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const { me, displayName, logout } = useSessionMe();

  return (
    <DashboardShell
      rightTitle={getTitleByPath(pathname)}
      userLabel={me?.username ? `${displayName}（${me.username}）` : '—'}
      onLogout={logout}
    >
      {children}
    </DashboardShell>
  );
}