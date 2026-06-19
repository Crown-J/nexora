// apps/nx-ui/src/features/layout/ui/DashboardShell.tsx
// NX00 統一 Dashboard 外殼（Phase 2 收斂、2026-06-17）
//
// 設計：
// - 一律 UnifiedTopBar + PlanetDock + DashboardSubNav 為頂層外殼
// - 2026-06-18 移除 BusinessTopNav（v1.2 §4.2 舊範式、被 PlanetDock + MasterQuickNav 取代）
// - 主檔頁（/dashboard/master/*）改為標準範式、不再 bypass、不再自帶 MasterTopBar
// - 退場：MasterTopBar（取代為 PageHeader 顯示分類/標題/計數）/ HomeTopBar / MobileWorkstationDock
// - 首頁 /dashboard：HomeShell 自帶外殼、本 layout 不額外包

'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardBulletinProvider } from '@/features/nx00/context/DashboardBulletinContext';
import { DashboardPaletteProvider } from '@/features/nx00/context/DashboardPaletteContext';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { DashboardSubNav } from '@design/layout/DashboardSubNav';
import { AutoPageGuide, PageGuideProvider } from '@/features/page-guide';
import { UnifiedTopBar } from '@design/layout/UnifiedTopBar';
import { PlanetDock } from '@design/layout/PlanetDock';
import { ScatterPageGate } from '@design/motion/scatter/ScatterPageGate';
import { usePlanet } from '@design/home/SharedPlanetRoot';
import { tryNavigate } from '@design/hooks/useDirtyGuard';
import { cn } from '@design/utils/cn';

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { me, displayName, logout, view } = useSessionMe();
  const [dockOpen, setDockOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { flyToCenter, flyTo } = usePlanet();

  const isSysDashboardHome = pathname === '/dashboard';
  const isFillViewportSubPage = pathname != null && pathname.startsWith('/dashboard/master/');

  const handleLogout = useCallback(() => {
    setIsLeaving(true);
    void (async () => {
      // 第一段：飛中央 / 第二段：飛回 login slot
      // 移除 setTimeout(100) race：placeAt rAF retry 自動等 login slot 出現
      await flyToCenter(800);
      logout();
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

  // 一般子頁（含主檔頁）：UnifiedTopBar + PlanetDock + DashboardSubNav + content
  return (
    <DashboardPaletteProvider>
      <DashboardBulletinProvider>
        <PageGuideProvider>
          <div className="relative flex h-dvh flex-col text-foreground overflow-hidden">
            {/* 底色 backdrop + 互動層（深色粒子 / 淺色六角凸出）由 root layout 統一掛、本層不重 mount */}
            <div
              className={`relative z-10 flex flex-1 min-h-0 flex-col transition-all duration-500 ease-out ${
                isLeaving ? 'opacity-0 scale-[0.96]' : 'animate-in fade-in duration-500'
              }`}
            >
              <UnifiedTopBar
                displayName={nameText}
                employeeNo={empNo}
                onLogout={handleLogout}
                onDockToggle={toggleDock}
                onHome={() => tryNavigate(() => router.push('/dashboard'))}
              />
              <PlanetDock open={dockOpen} onClose={closeDock} />
              <main
                className={cn(
                  'flex flex-1 min-h-0 flex-col px-3 py-3 sm:px-5',
                  isFillViewportSubPage ? 'gap-2' : 'gap-4',
                )}
              >
                <DashboardSubNav />
                <ScatterPageGate>
                  <div
                    className={cn(
                      'w-full min-w-0',
                      isFillViewportSubPage ? 'flex min-h-0 flex-1 flex-col gap-2' : 'space-y-4',
                    )}
                  >
                    {children}
                    <AutoPageGuide />
                  </div>
                </ScatterPageGate>
              </main>
            </div>
          </div>
        </PageGuideProvider>
      </DashboardBulletinProvider>
    </DashboardPaletteProvider>
  );
}
