// apps/nx-ui/src/features/layout/ui/DashboardShell.tsx
// NX00 統一 Dashboard 外殼（2026-06-15 棒 #2 收斂）
//
// 設計：
// - 一律 UnifiedTopBar + PlanetDock 為頂層外殼（取代 HomeTopBar）
// - MasterShell bypass 子頁（鋼鐵星球範式自帶 MasterTopBar）：仍 bypass、不疊新 TopBar、Phase 2 退場 MasterTopBar
// - 非 bypass 子頁：套 UnifiedTopBar + PlanetDock + BusinessTopNav + DashboardSubNav + children
// - 退場：HomeTopBar / MobileWorkstationDock / MobileFab 引用全清（三檔留檔、待引用清零後刪）
// - 首頁 /dashboard：HomeShell 自帶外殼、本 layout 不額外包

'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardBulletinProvider } from '@/features/sys-dashboard/context/DashboardBulletinContext';
import { DashboardPaletteProvider } from '@/features/sys-dashboard/context/DashboardPaletteContext';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { BusinessTopNav } from '@/features/layout/ui/BusinessTopNav';
import { DashboardSubNav } from '@/features/layout/ui/DashboardSubNav';
import { AutoPageGuide, PageGuideProvider } from '@/features/page-guide';
import { UnifiedTopBar } from '@/components/shell/UnifiedTopBar';
import { PlanetDock } from '@/components/shell/PlanetDock';
import { ParticleField } from '@/components/login/planet-orbit';
import { NxAppBackdrop } from '@/components/shell/NxAppBackdrop';
import { usePlanet } from '@/features/shared-planet/SharedPlanetRoot';
import { cn } from '@/lib/utils';

type DashboardShellProps = {
  children: ReactNode;
};

const MASTER_SHELL_BYPASS_PATHS = new Set([
  '/dashboard/base/users',
  '/dashboard/base/currency',
  '/dashboard/base/country',
  '/dashboard/base/part-group',
  '/dashboard/base/roles',
  '/dashboard/base/drivetrain',
  '/dashboard/base/model-type',
  '/dashboard/base/car-brand',
  '/dashboard/base/engine',
  '/dashboard/base/transmission',
  '/dashboard/base/model',
  '/dashboard/base/part-brand',
  '/dashboard/base/part-relation',
  '/dashboard/base/part-model',
  '/dashboard/base/warehouses',
  '/dashboard/base/customer-grade',
  '/dashboard/base/phonetic-dictionary',
  '/dashboard/base/partners',
  '/dashboard/base/partner-part',
  '/dashboard/base/discount-code',
  '/dashboard/base/site',
  '/dashboard/base/location',
  '/dashboard/base/parts',
  '/dashboard/base/brand-code-rule',
  '/dashboard/base/bulletins',
  '/dashboard/base/role-view',
  '/dashboard/base/user-role',
  '/dashboard/base/user-warehouse',
]);

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { me, displayName, logout, view } = useSessionMe();
  const [dockOpen, setDockOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { flyToCenter, flyTo } = usePlanet();

  const isSysDashboardHome = pathname === '/dashboard';
  const isMasterShellBypass = pathname != null && MASTER_SHELL_BYPASS_PATHS.has(pathname);
  const isFillViewportSubPage = pathname != null && pathname.startsWith('/dashboard/base/');

  const handleLogout = useCallback(() => {
    setIsLeaving(true);
    void (async () => {
      await flyToCenter(800);
      logout();
      await new Promise((r) => setTimeout(r, 100));
      await flyTo('login', 950);
    })();
  }, [flyToCenter, flyTo, logout]);
  const toggleDock = useCallback(() => setDockOpen((v) => !v), []);
  const closeDock = useCallback(() => setDockOpen(false), []);

  // Alt+X 全域 toggle dock
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        toggleDock();
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [toggleDock]);

  useEffect(() => {
    if (!view.loading && !me) router.replace('/login');
  }, [me, router, view.loading]);

  if (view.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">載入中…</div>
      </div>
    );
  }

  if (view.errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-lg">
          <div className="text-xs tracking-[0.35em] text-muted-foreground">NEXORA</div>
          <div className="mt-2 text-lg font-semibold">Session error</div>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{view.errorMsg}</div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs text-foreground transition hover:bg-secondary/80"
            >
              前往登入
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary transition hover:bg-primary/15"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nameText = displayName || me?.username || '系統管理員';
  const empNo = me?.username ?? '';

  // 首頁：HomeShell 自帶外殼、本 layout 不包
  if (isSysDashboardHome) {
    return (
      <PageGuideProvider>
        <AutoPageGuide />
        {children}
      </PageGuideProvider>
    );
  }

  // MasterShell bypass：子頁自帶 MasterTopBar（Phase 2 退場、本回合保留以免疊雙 topbar）
  if (isMasterShellBypass) {
    return (
      <PageGuideProvider>
        <AutoPageGuide />
        {children}
      </PageGuideProvider>
    );
  }

  // 一般子頁：UnifiedTopBar + PlanetDock + BusinessTopNav + DashboardSubNav + content
  return (
    <DashboardPaletteProvider>
      <DashboardBulletinProvider>
        <PageGuideProvider>
          <div className="relative flex min-h-screen flex-col text-foreground overflow-hidden">
            {/* 兩主題底色 backdrop + 滿屏星空粒子（與登入/首頁一致）*/}
            <NxAppBackdrop />
            <div className="fixed inset-0 z-0 pointer-events-none">
              <ParticleField className="w-full h-full" />
            </div>
            <div
              className={`relative z-10 flex flex-1 min-h-0 flex-col transition-all duration-500 ease-out ${
                isLeaving ? 'opacity-0 scale-[0.96]' : 'animate-in fade-in zoom-in-95 duration-500'
              }`}
            >
              <UnifiedTopBar
                displayName={nameText}
                employeeNo={empNo}
                onLogout={handleLogout}
                onDockToggle={toggleDock}
                onHome={() => router.push('/dashboard')}
              />
              <PlanetDock open={dockOpen} onClose={closeDock} />
              <main
                className={cn(
                  'flex flex-1 min-h-0 flex-col px-3 py-3 sm:px-5',
                  isFillViewportSubPage ? 'gap-2' : 'gap-4',
                )}
              >
                <BusinessTopNav />
                <DashboardSubNav />
                <div
                  className={cn(
                    'w-full min-w-0',
                    isFillViewportSubPage ? 'flex min-h-0 flex-1 flex-col gap-2' : 'space-y-4',
                  )}
                >
                  {children}
                  <AutoPageGuide />
                </div>
              </main>
            </div>
          </div>
        </PageGuideProvider>
      </DashboardBulletinProvider>
    </DashboardPaletteProvider>
  );
}
