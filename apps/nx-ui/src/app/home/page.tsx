/**
 * File: apps/nx-ui/src/app/home/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-002：登入後首頁（Landing / Home）
 * - 視覺：精簡首頁（Dock + TopBar + 行事曆 + 公告 + 未完成訂單）
 *
 * Notes:
 * - useSessionMe 驗證；未登入 → redirect /login
 * - logout 統一走 useSessionMe.logout
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { Dock, MobileDock } from '@/components/home/dock';
import { HomeTopBar } from '@/components/home/top-bar';
import { BulletinBoard } from '@/components/home/bulletin-board';
import { CalendarPanel } from '@/components/home/calendar-panel';
import { CalendarDetails } from '@/components/home/calendar-details';
import { TaskList } from '@/components/home/task-list';
import { ParticleField } from '@/components/login/planet-orbit';

export default function HomePage() {
  const router = useRouter();
  const { me, displayName, logout, view } = useSessionMe();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date());

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

          <div className="mt-4 text-xs text-muted-foreground">checkedAt: {view.checkedAt || '—'}</div>
        </div>
      </div>
    );
  }

  const nameText = displayName || me?.username || '系統管理員';

  return (
    <div className="home-shell min-h-screen bg-background relative overflow-hidden">
      <div className="home-stars pointer-events-none absolute inset-0 z-0">
        <ParticleField className="w-full h-full opacity-55" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/20 via-transparent to-background" />
      <div className="home-aurora-light pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_15%_20%,rgba(244,176,52,0.10),transparent_38%),radial-gradient(circle_at_88%_4%,rgba(244,176,52,0.07),transparent_28%)]" />
      <div className="home-backdrop-vignette pointer-events-none absolute inset-0 z-0" />

      <div className="relative z-10">
      <div className="hidden lg:block">
        <Dock />
      </div>

      <div>
        <HomeTopBar
          displayName={nameText}
          roleLabel="使用者"
          onLogout={logout}
          onOpenDashboard={() => router.push('/dashboard')}
        />

        <main className="px-4 pt-20 pb-20 lg:px-7 lg:pb-6 lg:pl-24 lg:pt-[calc(4rem+1.75rem)]">
          <div className="max-w-7xl mx-auto space-y-5">
            <section className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
              <CalendarPanel selectedDate={selectedDate} onDateSelect={setSelectedDate} />
              <CalendarDetails selectedDate={selectedDate} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BulletinBoard />
              <TaskList />
            </section>
          </div>
        </main>
      </div>

      <MobileDock />
      </div>
    </div>
  );
}
