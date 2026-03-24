/**
 * File: apps/nx-ui/src/features/layout/ui/ErpAppShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-ERP-001：v0 殼層（固定 Top Bar、桌面 hover Dock、手機底欄）
 */

'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TopModuleTabs } from '@/features/layout/ui/TopModuleTabs';
import { DOCK_NAV_ITEMS, isDockItemActive } from '@/features/layout/config/dock-nav';
import { cx } from '@/shared/lib/cx';

type ErpAppShellProps = {
  children: ReactNode;
  userLabel?: string;
  onLogout?: () => void;
};

function getDockIconScale(hoveredIndex: number | null, index: number): number {
  if (hoveredIndex === null) return 1;
  const distance = Math.abs(hoveredIndex - index);
  if (distance === 0) return 1.5;
  if (distance === 1) return 1.25;
  return 1;
}

/**
 * @FUNCTION_CODE NX00-UI-SHELL-ERP-001-F01
 */
export function ErpAppShell({ children, userLabel = '—', onLogout }: ErpAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dockVisible, setDockVisible] = useState(false);
  const [hoveredDockIndex, setHoveredDockIndex] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090d] text-white">
      <BackgroundLayer />

      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/10 bg-[#07090d]/90 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-5">
          <BrandBlock />

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <TopModuleTabs />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 sm:block">
              {userLabel}
            </div>
            <button
              type="button"
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

      <div
        className="fixed bottom-0 left-0 top-14 z-40 hidden items-center md:flex"
        onMouseEnter={() => setDockVisible(true)}
        onMouseLeave={() => {
          setDockVisible(false);
          setHoveredDockIndex(null);
        }}
      >
        <div className="h-full w-1 shrink-0 bg-white/20 transition-colors hover:bg-white/35" aria-hidden />

        <div
          className={cx(
            'transition-all duration-300 ease-out',
            dockVisible ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-full opacity-0'
          )}
        >
          <div className="p-2">
            <div className="rounded-2xl border border-white/10 bg-[#0b0f17]/95 p-2 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex flex-col items-center gap-1">
                {DOCK_NAV_ITEMS.map((item, index) => {
                  const Icon = item.icon;
                  const active = isDockItemActive(pathname, item.href);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => router.push(item.href)}
                      onMouseEnter={() => setHoveredDockIndex(index)}
                      onMouseLeave={() => setHoveredDockIndex(null)}
                      style={{
                        transform: `scale(${getDockIconScale(hoveredDockIndex, index)})`,
                        transformOrigin: 'left center',
                      }}
                      className={cx(
                        'relative rounded-xl p-2 transition-all duration-200 ease-out',
                        active
                          ? 'bg-[#39ff14]/20 text-[#39ff14] shadow-lg shadow-[#39ff14]/20'
                          : 'text-white/70 hover:bg-white/[0.06]'
                      )}
                      aria-label={item.label}
                    >
                      <span className="block h-6 w-6">
                        <Icon />
                      </span>
                      {hoveredDockIndex === index ? (
                        <span className="absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-zinc-800 px-2 py-1 text-xs text-white shadow-lg">
                          {item.label}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen pt-14 pb-24 md:pb-6">
        <div className="md:pl-2 lg:pl-4">
          <div className="px-3 py-3 sm:px-6 sm:py-5">{children}</div>
        </div>
      </div>

      <ErpMobileDockNav />
    </div>
  );
}

/**
 * 手機底欄（與 ErpAppShell 相同；/home 等非 layout 頁可單獨引用）
 */
export function ErpMobileDockNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-3 left-1/2 z-40 flex w-[calc(100%-24px)] -translate-x-1/2 items-center justify-around rounded-2xl border border-white/15 bg-black/50 px-2 py-2 backdrop-blur-2xl md:hidden">
      {DOCK_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isDockItemActive(pathname, item.href);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => router.push(item.href)}
            className={cx(
              'flex min-w-[44px] flex-col items-center rounded-xl px-2 py-2 text-[10px] transition',
              active ? 'bg-emerald-300/20 text-emerald-100' : 'text-white/70'
            )}
          >
            <Icon />
            <span className="mt-1">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * 手機版頂欄（與 ErpAppShell 品牌列一致，供 /home 等非 dashboard layout 頁使用）
 */
export function ErpMobileTopBar({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="mb-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)] md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <span className="text-[10px] font-semibold tracking-[0.2em] text-white/90">NX</span>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-[0.28em] text-white/90">NEXORA</div>
            <div className="text-[11px] text-white/45">Console</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

function BrandBlock() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <span className="text-[10px] font-semibold tracking-[0.25em] text-white/90">NX</span>
      </div>
      <div>
        <div className="text-sm font-semibold tracking-[0.35em] text-white/90">NEXORA</div>
        <div className="text-xs text-white/40">Console</div>
      </div>
    </div>
  );
}

function BackgroundLayer() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#39ff14]/10 blur-[80px]" />
      <div className="absolute -right-40 -top-52 h-[520px] w-[520px] rounded-full bg-white/5 blur-[90px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/60" />
    </div>
  );
}
