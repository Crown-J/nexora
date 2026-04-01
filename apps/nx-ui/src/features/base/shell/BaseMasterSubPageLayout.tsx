/**
 * File: apps/nx-ui/src/features/base/shell/BaseMasterSubPageLayout.tsx
 *
 * Purpose:
 * - 主檔子頁共用外殼（與 /base/user 標頭與 Landing 一致）
 */

'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { HomeTopBar } from '@/components/home/top-bar';
import { HomeLandingChrome } from '@/components/home/home-landing-chrome';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export type BaseMasterSubPageLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function BaseMasterSubPageLayout({ title, description, children }: BaseMasterSubPageLayoutProps) {
  const router = useRouter();
  const { me, displayName, tenantNameZh, tenantNameEn, logout, view } = useSessionMe();

  useEffect(() => {
    if (!view.loading && !me) router.replace('/login');
  }, [me, router, view.loading]);

  if (view.loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">載入中…</div>
      </div>
    );
  }

  if (view.errorMsg) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-lg">
          <div className="text-xs tracking-[0.35em] text-muted-foreground">NEXORA</div>
          <div className="mt-2 text-lg font-semibold text-foreground">Session error</div>
          <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{view.errorMsg}</div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs text-foreground hover:bg-secondary/80 transition"
            >
              重新登入
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary hover:bg-primary/15 transition"
            >
              登出
            </button>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">checkedAt: {view.checkedAt || '—'}</div>
        </div>
      </div>
    );
  }

  const nameText = displayName || me?.username || '系統使用者';

  return (
    <HomeLandingChrome
      topBar={
        <HomeTopBar
          displayName={nameText}
          roleLabel="使用者"
          onLogout={logout}
          onOpenDashboard={() => router.push('/dashboard')}
          tenantNameZh={tenantNameZh || null}
          tenantNameEn={tenantNameEn || null}
        />
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <BaseMasterPageHeader title={title} description={description} />

        {children}
      </div>
    </HomeLandingChrome>
  );
}
