/**
 * File: apps/nx-ui/src/app/base/users/page.tsx
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { HomeTopBar } from '@/components/home/top-bar';
import { HomeLandingChrome } from '@/components/home/home-landing-chrome';
import { BaseUserMasterView } from '@/features/base/users/BaseUserMasterView';
import { cn } from '@/lib/utils';

export default function BaseUsersPage() {
  const router = useRouter();
  const { me, displayName, logout, view } = useSessionMe();

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
        />
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-3">
          <Link
            href="/base"
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors',
              'hover:text-primary',
            )}
          >
            <ChevronLeft className="size-4" aria-hidden />
            返回主檔
          </Link>
          <div className="space-y-1">
            <p className="text-xs tracking-[0.35em] text-muted-foreground">MASTER DATA</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">使用者主檔</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">維護系統使用者與職稱（目前為前端 mock，未接 API）。</p>
          </div>
        </header>

        <BaseUserMasterView />
      </div>
    </HomeLandingChrome>
  );
}
