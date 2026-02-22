/**
 * File: apps/nx-ui/src/features/layout/ui/DashboardShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-005：Dashboard 版面殼（TopBar + Left Menu + Main Content）
 */

'use client';

import type { ReactNode } from 'react';
import { TopModuleTabs } from '@/features/layout/ui/TopModuleTabs';
import { SideMenu } from '@/features/layout/ui/SideMenu';
import { cx } from '@/shared/lib/cx';

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
    <div className="relative min-h-screen overflow-hidden bg-[#07090d] text-white">
      <BackgroundLayer />

      <div className="relative px-6 py-5">
        <ShellHeader userLabel={userLabel} onLogout={onLogout} />

        <div className="mt-5 flex gap-5">
          <SideMenu />

          <main className="flex-1">
            <ContentFrame title={title}>{children}</ContentFrame>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ============================= */
/* Internal Sub Components       */
/* ============================= */

function BackgroundLayer() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#39ff14]/10 blur-[80px]" />
      <div className="absolute -top-52 -right-40 h-[520px] w-[520px] rounded-full bg-white/5 blur-[90px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/60" />
    </div>
  );
}

function ShellHeader({
  userLabel,
  onLogout,
}: {
  userLabel: string;
  onLogout?: () => void;
}) {
  return (
    <header className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-4">
        <BrandBlock />

        <TopModuleTabs />

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
            {userLabel}
          </div>

          <button
            onClick={onLogout}
            className={cx(
              'rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75',
              'transition hover:bg-white/10'
            )}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function BrandBlock() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <span className="text-[10px] font-semibold tracking-[0.25em] text-white/90">
          NX
        </span>
      </div>
      <div>
        <div className="text-sm font-semibold tracking-[0.35em] text-white/90">
          NEXORA
        </div>
        <div className="text-xs text-white/40">Console</div>
      </div>
    </div>
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
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-sm text-white/85">{title ?? '—'}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}