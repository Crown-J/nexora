// apps/nx-ui/src/features/sys-dashboard/ui/SysDashboardPage.tsx
// 首頁儀表板殼 — MasterTopBar + 星空 layered 背景 + HomeDashboardV2
//
// 2026-06-03 打磨：背景換成登入頁/HomeLandingChrome 同套 layered（星點 + 星系光暈 + aurora + vignette）
// 取代寫死的 radial-gradient、找回宇宙氛圍

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { ParticleField } from '@/components/login/planet-orbit';
import { HomeDashboardV2 } from '@/features/home-dashboard/HomeDashboardV2';
import { MasterTopBar } from '@/features/master-shell/entity-master/MasterTopBar';

export function SysDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isTypingContext = (t: EventTarget | null) => {
      if (!t || !(t instanceof HTMLElement)) return false;
      if (t.isContentEditable) return true;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingContext(e.target)) return;
      if (e.key === '/' && pathname === '/dashboard') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  return (
    <div className="home-shell relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* 背景 layered（沿用 HomeLandingChrome 範式）：星點 + 天幕輝光 + aurora + vignette */}
      <div className="home-stars pointer-events-none absolute inset-0 z-0">
        <ParticleField className="home-stars-canvas h-full w-full" />
      </div>
      <div className="home-sky-glow pointer-events-none absolute inset-0 z-0" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/10 via-transparent to-background/60" />
      <div className="home-aurora-light pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_15%_20%,rgba(244,176,52,0.10),transparent_38%),radial-gradient(circle_at_88%_4%,rgba(244,176,52,0.07),transparent_28%)]" />
      <div className="home-backdrop-vignette pointer-events-none absolute inset-0 z-0" />

      {/* 前景內容 */}
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <MasterTopBar
          category="首頁"
          title="個人儀表板"
          count=""
          requestNavigate={(href) => router.push(href)}
        />

        <input
          ref={searchRef}
          type="search"
          tabIndex={-1}
          className="sr-only"
          aria-label="全域搜尋"
          placeholder="搜尋…"
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <HomeDashboardV2 />
        </div>
      </div>
    </div>
  );
}
