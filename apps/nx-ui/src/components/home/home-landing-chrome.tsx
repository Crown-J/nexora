/**
 * File: apps/nx-ui/src/components/home/home-landing-chrome.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 登入後「Landing」系外殼：星空背景 + 頂欄星球 + main + MobileDock（小螢幕；首頁 `/dashboard` 底欄為五項圖示＋功能名，其餘為模組圖示）
 * - 與 /home、/base 等頁一致，避免 TopBar／背景／間距漂移
 */

import type { ReactNode } from 'react';
import { MobileDock } from '@/components/home/dock';
import { ParticleField } from '@/components/login/planet-orbit';
import { cn } from '@/lib/utils';

export type HomeLandingChromeProps = {
  topBar: ReactNode;
  children: ReactNode;
  /** 首頁儀表板：鎖定視窗高度、避免整頁捲動，改由各區塊內捲動 */
  fillViewport?: boolean;
};

export function HomeLandingChrome({ topBar, children, fillViewport }: HomeLandingChromeProps) {
  return (
    <div
      className={cn(
        'home-shell relative overflow-hidden bg-background',
        fillViewport ? 'flex h-dvh max-h-dvh flex-col' : 'min-h-screen',
      )}
    >
      <div className="home-stars pointer-events-none absolute inset-0 z-0">
        <ParticleField className="home-stars-canvas h-full w-full" />
      </div>
      <div
        className="home-sky-glow pointer-events-none absolute inset-0 z-0"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/20 via-transparent to-background" />
      <div className="home-aurora-light pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_15%_20%,rgba(244,176,52,0.10),transparent_38%),radial-gradient(circle_at_88%_4%,rgba(244,176,52,0.07),transparent_28%)]" />
      <div className="home-backdrop-vignette pointer-events-none absolute inset-0 z-0" />

      <div className={cn('relative z-10', fillViewport && 'flex min-h-0 flex-1 flex-col')}>
        <div className={cn(fillViewport && 'flex min-h-0 flex-1 flex-col')}>
          {topBar}
          <main
            className={cn(
              // 業界改革 #22 v1.2 + Crown 拍板「表格滿版、邊距縮小一半」：px-4 lg:px-7 → px-2 lg:px-3
              'px-2 pt-20 lg:px-3 lg:pt-20',
              fillViewport
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden pb-24 lg:pb-6'
                : 'pb-20 lg:pb-6',
            )}
          >
            {children}
          </main>
        </div>

        <MobileDock />
      </div>
    </div>
  );
}
