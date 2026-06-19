// apps/nx-ui/src/design/home/HomeShell.tsx
// NX00 首頁外殼：UnifiedTopBar + PlanetDock + HomeView 三層組合

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedTopBar } from '@design/layout/UnifiedTopBar';
import { PlanetDock } from '@design/layout/PlanetDock';
import { ScatterPageGate } from '@design/motion/scatter/ScatterPageGate';
import { HomeView } from '@design/home/HomeView';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { usePlanet } from '@design/home/SharedPlanetRoot';

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
    <div className="relative flex h-dvh flex-col text-foreground overflow-hidden">
      {/* 底色 backdrop + 互動層（深色粒子 / 淺色六角凸出）由 root layout 統一掛、本層不重 mount */}
      {/* 內容層 z-10、mount 時 fade-in / logout 時 fade-out */}
      <div
        className={`relative z-10 flex flex-1 min-h-0 flex-col transition-all duration-500 ease-out ${
          isLeaving ? 'opacity-0 scale-[0.96]' : 'animate-in fade-in duration-500'
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
          <ScatterPageGate>
            <HomeView displayName={nameText} />
          </ScatterPageGate>
        </main>
      </div>
    </div>
  );
}
