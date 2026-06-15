// apps/nx-ui/src/features/home/HomeShell.tsx
// NX00 首頁外殼：UnifiedTopBar + PlanetDock + HomeView 三層組合
// 取代 SysDashboardPage（舊版用 MasterTopBar）作為 /dashboard 落地頁

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedTopBar } from '@/components/shell/UnifiedTopBar';
import { PlanetDock } from '@/components/shell/PlanetDock';
import { HomeView } from '@/features/home/HomeView';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { ParticleField } from '@/components/login/planet-orbit';
import { NxAppBackdrop } from '@/components/shell/NxAppBackdrop';
import { usePlanet } from '@/features/shared-planet/SharedPlanetRoot';

export function HomeShell() {
  const router = useRouter();
  const { me, displayName, logout, view } = useSessionMe();
  const { flyToCenter, flyTo } = usePlanet();
  const [dockOpen, setDockOpen] = useState(false);
  // 轉場 leaving 旗：登出時 fade-out + 星球反向飛回登入大圖位置（對齊 Hana B 段）
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLogout = useCallback(() => {
    setIsLeaving(true);
    void (async () => {
      // 第一段：星球從 TopBar 脫離飛中央 0.8s
      await flyToCenter(800);
      // 切到 /login（login 頁 mount + login slot 註冊）
      logout();
      // 第二段：飛回 login slot 大圖位置 0.95s
      // 移除原本的 setTimeout(100) race 賭注：placeAt 內建 rAF retry 會等 login slot 出現才飛、不需硬等
      await flyTo('login', 950);
    })();
  }, [flyToCenter, flyTo, logout]);

  const toggleDock = useCallback(() => setDockOpen((v) => !v), []);
  const closeDock = useCallback(() => setDockOpen(false), []);

  // 全域 Alt+X 切換 dock
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

  // 未登入 → /login
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

  const nameText = displayName || me?.username || '系統管理員';
  const empNo = me?.username ?? '';

  return (
    <div className="relative flex min-h-screen flex-col text-foreground overflow-hidden">
      {/* 兩主題底色 backdrop（深色黑+極光 / 淺色灰藍+光暈、即時切隨 html.light）*/}
      <NxAppBackdrop />
      {/* 跟登入畫面一致：滿屏星空粒子（z-0、不擋互動）*/}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleField className="w-full h-full" />
      </div>
      {/* 內容層 z-10、mount 時 fade-in / logout 時 fade-out */}
      <div
        className={`relative z-10 flex flex-1 min-h-0 flex-col transition-all duration-500 ease-out ${
          isLeaving ? 'opacity-0 scale-[0.96]' : 'animate-in fade-in zoom-in-95 duration-500'
        }`}
      >
        <UnifiedTopBar
          displayName={nameText}
          employeeNo={empNo}
          onLogout={handleLogout}
          onDockToggle={toggleDock}
          onHome={() => router.push('/dashboard')}
        />
        <PlanetDock open={dockOpen} onClose={closeDock} />
        <main className="flex flex-1 min-h-0 flex-col">
          <HomeView displayName={nameText} />
        </main>
      </div>
    </div>
  );
}
