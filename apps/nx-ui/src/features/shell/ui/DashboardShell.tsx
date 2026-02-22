/**
 * File: apps/nx-ui/src/features/shell/ui/DashboardShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-005：Dashboard 版面殼（TopBar + Left Menu + Main Content）
 */

'use client';

import { ReactNode } from 'react';
import { TopModuleTabs } from '@/features/shell/ui/TopModuleTabs';
import { SideMenu } from '@/features/shell/ui/SideMenu';
import { cx } from '@/shared/lib/cx';

type Props = {
  children: ReactNode;
  rightTitle?: string;
  userLabel?: string;
  onLogout?: () => void;
};

/**
 * @FUNCTION_CODE NX00-UI-SHELL-005-F01
 * 說明：
 * - DashboardShell：固定版面
 *   1) 上方：品牌 + 模組 Tabs + 使用者 + Logout
 *   2) 左側：次功能選單（依模組）
 *   3) 右側：內容區（表格/表單）
 *
 * - children 會被放到右側 Content Frame
 */
export function DashboardShell({ children, rightTitle, userLabel = '—', onLogout }: Props) {
  return (
    <div className="min-h-screen bg-[#07090d] text-white relative overflow-hidden">
      {/* 背景光暈（延續你 login/dashboard 風格） */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#39ff14]/10 blur-[80px]" />
        <div className="absolute -top-52 -right-40 h-[520px] w-[520px] rounded-full bg-white/5 blur-[90px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/60" />
      </div>

      <div className="relative px-6 py-5">
        {/* ===== Top Bar ===== */}
        <header className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)] px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                <span className="text-[10px] font-semibold tracking-[0.25em] text-white/90">NX</span>
              </div>
              <div>
                <div className="text-sm tracking-[0.35em] font-semibold text-white/90">NEXORA</div>
                <div className="text-xs text-white/40">Console</div>
              </div>
            </div>

            <TopModuleTabs />

            <div className="flex items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                {userLabel}
              </div>
              <button
                onClick={onLogout}
                className={cx(
                  'rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75',
                  'hover:bg-white/10 transition'
                )}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* ===== Body ===== */}
        <div className="mt-5 flex gap-5">
          <SideMenu />

          <main className="flex-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
              <div className="px-5 py-4 border-b border-white/10">
                <div className="text-sm text-white/85">{rightTitle ?? '—'}</div>
              </div>
              <div className="p-5">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}