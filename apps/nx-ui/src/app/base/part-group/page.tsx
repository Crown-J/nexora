'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { HomeTopBar } from '@/components/home/top-bar';
import { HomeLandingChrome } from '@/components/home/home-landing-chrome';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
import { BasePartGroupApiMasterView } from '@/features/base/part-group/BasePartGroupApiMasterView';

export default function BasePartGroupPage() {
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
          <div className="text-lg font-semibold">Session error</div>
          <div className="mt-2 text-sm text-muted-foreground">{view.errorMsg}</div>
          <button
            type="button"
            className="mt-4 rounded-xl border border-border px-4 py-2 text-xs"
            onClick={() => router.replace('/login')}
          >
            重新登入
          </button>
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
          roleLabel="零件族群主檔"
          onLogout={logout}
          onOpenDashboard={() => router.push('/dashboard')}
          tenantNameZh={tenantNameZh || null}
          tenantNameEn={tenantNameEn || null}
        />
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <BaseMasterPageHeader title="零件族群主檔" />
        <BasePartGroupApiMasterView />
      </div>
    </HomeLandingChrome>
  );
}
