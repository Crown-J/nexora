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

export function HomeShell() {
  const router = useRouter();
  const { me, displayName, logout, view } = useSessionMe();
  const [dockOpen, setDockOpen] = useState(false);

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <UnifiedTopBar
        displayName={nameText}
        employeeNo={empNo}
        onLogout={logout}
        onDockToggle={toggleDock}
        onHome={() => router.push('/dashboard')}
      />
      <PlanetDock open={dockOpen} onClose={closeDock} />
      <main className="flex flex-1 min-h-0 flex-col">
        <HomeView displayName={nameText} />
      </main>
    </div>
  );
}
