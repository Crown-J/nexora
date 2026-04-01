/**
 * File: apps/nx-ui/src/components/home/home-landing-chrome.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 登入後「Landing」系畫面共用外殼：星空背景 + 頂欄星球模組選單 + main 預留 + MobileDock（小螢幕底欄）
 * - 與 /home、/base 等頁一致，避免 TopBar／背景／間距漂移
 */

import type { ReactNode } from 'react';
import { MobileDock } from '@/components/home/dock';
import { ParticleField } from '@/components/login/planet-orbit';

export type HomeLandingChromeProps = {
  topBar: ReactNode;
  children: ReactNode;
};

export function HomeLandingChrome({ topBar, children }: HomeLandingChromeProps) {
  return (
    <div className="home-shell min-h-screen bg-background relative overflow-hidden">
      <div className="home-stars pointer-events-none absolute inset-0 z-0">
        <ParticleField className="w-full h-full opacity-55" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/20 via-transparent to-background" />
      <div className="home-aurora-light pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_15%_20%,rgba(244,176,52,0.10),transparent_38%),radial-gradient(circle_at_88%_4%,rgba(244,176,52,0.07),transparent_28%)]" />
      <div className="home-backdrop-vignette pointer-events-none absolute inset-0 z-0" />

      <div className="relative z-10">
        <div>
          {topBar}
          <main className="px-4 pb-20 pt-20 lg:px-7 lg:pb-6 lg:pt-20">{children}</main>
        </div>

        <MobileDock />
      </div>
    </div>
  );
}
