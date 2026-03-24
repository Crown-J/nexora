/**
 * File: apps/nx-ui/src/features/layout/ui/DashboardShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-005：Dashboard 版面殼（ErpAppShell + 內容框）
 */

'use client';

import type { ReactNode } from 'react';
import { ErpAppShell } from '@/features/layout/ui/ErpAppShell';

type DashboardShellProps = {
  children: ReactNode;
  title?: string;
  userLabel?: string;
  onLogout?: () => void;
};

/**
 * @FUNCTION_CODE NX00-UI-SHELL-005-F01
 */
export function DashboardShell({
  children,
  title,
  userLabel = '—',
  onLogout,
}: DashboardShellProps) {
  return (
    <ErpAppShell userLabel={userLabel} onLogout={onLogout}>
      <ContentFrame title={title}>{children}</ContentFrame>
    </ErpAppShell>
  );
}

function ContentFrame({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
      {title ? (
        <div className="border-b border-white/10 px-3 py-3 sm:px-5 sm:py-4">
          <div className="text-sm text-white/85">{title}</div>
        </div>
      ) : null}
      <div className="p-3 sm:p-5">{children}</div>
    </div>
  );
}
