/**
 * File: apps/nx-ui/src/features/layout/ui/DashboardShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Dashboard 版面殼：與 /home、/base 相同 Landing 外殼（Dock、星空背景、HomeTopBar）
 * - 頂欄中央為主模組 Tabs；次功能為橫向 DashboardSubNav（取代舊版側欄）
 */

'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HomeLandingChrome } from '@/components/home/home-landing-chrome';
import { HomeTopBar } from '@/components/home/top-bar';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { TopModuleTabs } from '@/features/layout/ui/TopModuleTabs';
import { DashboardSubNav } from '@/features/layout/ui/DashboardSubNav';
import { cn } from '@/lib/utils';

type DashboardShellProps = {
  children: ReactNode;
  /** 右側內容框標題；省略則不顯示標題列 */
  title?: string;
};

function ContentFrame({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card/60 shadow-sm backdrop-blur-sm',
        'text-foreground',
      )}
    >
      {title ? (
        <div className="border-b border-border/60 px-5 py-4">
          <div className="text-sm font-medium text-foreground">{title}</div>
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </div>
  );
}

/**
 * @FUNCTION_CODE NX00-UI-SHELL-005-F01
 */
export function DashboardShell({ children, title }: DashboardShellProps) {
  const router = useRouter();
  const { me, displayName, logout, view } = useSessionMe();

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

  return (
    <HomeLandingChrome
      topBar={
        <HomeTopBar
          displayName={nameText}
          roleLabel="使用者"
          onLogout={logout}
          onOpenDashboard={() => router.push('/home')}
          centerContent={<TopModuleTabs />}
        />
      }
    >
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <DashboardSubNav />
        <ContentFrame title={title}>{children}</ContentFrame>
      </div>
    </HomeLandingChrome>
  );
}
