'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { HomeTopBar } from '@/components/home/top-bar';
import { HomeLandingChrome } from '@/components/home/home-landing-chrome';
import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { Button } from '@/components/ui/button';

/**
 * 舊路徑 /base/brand：改為兩張主檔入口（汽車廠牌／零件廠牌）。
 */
export default function BaseBrandHubPage() {
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

  const nameText = displayName || me?.username || '系統使用者';

  return (
    <HomeLandingChrome
      topBar={
        <HomeTopBar
          displayName={nameText}
          roleLabel="廠牌主檔"
          onLogout={logout}
          onOpenDashboard={() => router.push('/dashboard')}
          tenantNameZh={tenantNameZh || null}
          tenantNameEn={tenantNameEn || null}
        />
      }
    >
      <BaseMasterSubPageLayout title="廠牌主檔" description="請選擇要維護的廠牌類型（版型與零件主檔相同）。">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="default" className="w-full sm:w-auto" asChild>
            <Link href="/base/car-brand">汽車廠牌主檔</Link>
          </Button>
          <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/base/part-brand">零件廠牌主檔</Link>
          </Button>
        </div>
      </BaseMasterSubPageLayout>
    </HomeLandingChrome>
  );
}
