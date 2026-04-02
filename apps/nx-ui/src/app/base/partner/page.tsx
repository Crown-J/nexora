/**
 * 客戶主檔（/base/partner）
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { HomeTopBar } from '@/components/home/top-bar';
import { HomeLandingChrome } from '@/components/home/home-landing-chrome';
import { BasePartnerMasterView } from '@/features/base/partner/BasePartnerMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BasePartnerPage() {
  const router = useRouter();
  const { me, displayName, tenantNameZh, tenantNameEn, logout, view } = useSessionMe();

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
          <div className="mt-2 text-lg font-semibold text-foreground">Session error</div>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{view.errorMsg}</div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs text-foreground transition hover:bg-secondary/80"
            >
              重新登入
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary transition hover:bg-primary/15"
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
        <BaseMasterPageHeader title="客戶主檔" />
        <BasePartnerMasterView />
      </div>
    </HomeLandingChrome>
  );
}
