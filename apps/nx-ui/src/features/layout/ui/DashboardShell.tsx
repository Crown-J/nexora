/**
 * File: apps/nx-ui/src/features/layout/ui/DashboardShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Dashboard 版面殼：與 /home、/base 相同 Landing 外殼（頂欄星球模組選單、星空背景、HomeTopBar）
 * - 頂欄中央為主模組 Tabs；次功能為橫向 DashboardSubNav（取代舊版側欄）
 */

'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { HomeLandingChrome } from '@/components/home/home-landing-chrome';
import { HomeTopBar } from '@/components/home/top-bar';
import { DashboardBulletinProvider } from '@/features/sys-dashboard/context/DashboardBulletinContext';
import { DashboardPaletteProvider } from '@/features/sys-dashboard/context/DashboardPaletteContext';
import { DashboardHomePlanProvider } from '@/features/sys-dashboard/context/DashboardHomePlanContext';
import { TopBarPlanToggles } from '@/features/sys-dashboard/ui/TopBarPlanToggles';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { DashboardSubNav } from '@/features/layout/ui/DashboardSubNav';
import { normalizePlanCode } from '@/features/base/config/master-cards';
import { cn } from '@/lib/utils';

type DashboardShellProps = {
  children: ReactNode;
};

/**
 * @FUNCTION_CODE NX00-UI-SHELL-005-F01
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { me, displayName, tenantNameZh, tenantNameEn, planCode, logout, view } = useSessionMe();
  const isSysDashboardHome = pathname === '/dashboard';
  // 業界改革 #22 v1.2：主檔子頁 fillViewport 模式（表格內部 scroll、horizontal scroll bar sticky 底部）
  // 對齊 Crown 拍板「滾軸像試算表固定、右側滾輪在表格內而非整頁」
  const isFillViewportSubPage = pathname != null && pathname.startsWith('/dashboard/base/');
  // 鋼鐵星球範式 bypass（commit 58）：使用者主檔自帶完整 MasterShell，跳過 DashboardShell chrome 避免雙 shell 疊加。
  // 對齊 Crown 拍板「lab 範式取代 DashboardShell」。
  // 之後其他主檔陸續推進時可在此擴充判斷集合。
  const isMasterShellBypass = pathname === '/dashboard/base/users';
  // 業界改革 #22 v1.1：TopBar plan chip 揭露當前訂閱方案（loading / 未登入時不渲染）
  const normalizedPlan = planCode ? normalizePlanCode(planCode) : null;

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

  // MasterShell bypass：跳過 DashboardShell chrome、直接 render children（children 自帶 MasterShell）
  if (isMasterShellBypass) {
    return <>{children}</>;
  }

  return (
    <DashboardPaletteProvider>
      <DashboardBulletinProvider>
        {isSysDashboardHome ? (
          <DashboardHomePlanProvider>
            <HomeLandingChrome
              fillViewport
              topBar={
                <HomeTopBar
                  displayName={nameText}
                  roleLabel="使用者"
                  onLogout={logout}
                  onOpenDashboard={() => router.push('/dashboard')}
                  tenantNameZh={tenantNameZh || null}
                  tenantNameEn={tenantNameEn || null}
                  planCode={normalizedPlan}
                  centerContent={<TopBarPlanToggles />}
                />
              }
            >
              <div className="mx-auto flex h-full min-h-0 w-full max-w-none flex-1 flex-col px-1 text-foreground sm:px-2">
                {children}
              </div>
            </HomeLandingChrome>
          </DashboardHomePlanProvider>
        ) : (
          <HomeLandingChrome
            fillViewport={isFillViewportSubPage}
            topBar={
              <HomeTopBar
                displayName={nameText}
                roleLabel="使用者"
                onLogout={logout}
                onOpenDashboard={() => router.push('/dashboard')}
                tenantNameZh={tenantNameZh || null}
                tenantNameEn={tenantNameEn || null}
                planCode={normalizedPlan}
              />
            }
          >
            <div
              className={cn(
                'w-full min-w-0',
                isFillViewportSubPage
                  ? 'flex min-h-0 flex-1 flex-col gap-2'
                  : 'space-y-4',
              )}
            >
              <DashboardSubNav />
              {children}
            </div>
          </HomeLandingChrome>
        )}
      </DashboardBulletinProvider>
    </DashboardPaletteProvider>
  );
}
