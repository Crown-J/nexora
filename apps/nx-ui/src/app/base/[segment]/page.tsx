/**
 * File: apps/nx-ui/src/app/base/[segment]/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 主檔子功能占位：與 hub 相同外殼，內容建置中
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { HomeTopBar } from '@/components/home/top-bar';
import { HomeLandingChrome } from '@/components/home/home-landing-chrome';
import { getBaseSegmentTitle, isValidBaseSegment } from '@/app/base/master-cards';

export default function BaseSegmentPlaceholderPage() {
  const router = useRouter();
  const params = useParams();
  const segment = typeof params.segment === 'string' ? params.segment : '';
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
              前往登入
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary hover:bg-primary/15 transition"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nameText = displayName || me?.username || '系統管理員';
  const valid = isValidBaseSegment(segment);
  const title = valid ? getBaseSegmentTitle(segment)! : '找不到頁面';

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
        <Link
          href="/base"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          返回主檔總覽
        </Link>

        <div className="glass-card rounded-2xl border border-border/80 p-8 shadow-sm max-w-xl">
          {valid ? (
            <>
              <p className="text-xs tracking-[0.35em] text-muted-foreground">MASTER DATA</p>
              <h1 className="mt-2 text-xl font-semibold text-foreground">{title}</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                此功能畫面建置中，目前為占位頁。測試資料與表單將於後續迭代接上。
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground">無此主檔項目</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                路徑 <span className="font-mono text-foreground/80">/base/{segment || '…'}</span> 不存在。
              </p>
            </>
          )}
        </div>
      </div>
    </HomeLandingChrome>
  );
}
