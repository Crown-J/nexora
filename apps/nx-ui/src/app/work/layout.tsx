// apps/nx-ui/src/app/work/layout.tsx
// 新殼 Layout（新版面封存軌 2026-07-26：舊 /dashboard 軟封存、/work 起新世界）
//
// - WorkShell：左側可收縮選單＋內容區（簡約、白紙起步）
// - 即時工作檯三件組跟舊版面同款掛法（F2 選單＋站 1 事件浮層）：
//   選單入口 dispatch nx-instant-station-open 指名開站
// - 不掛 GlobalKeymap（其 Home 鍵導向舊 /dashboard、新殼不適用）

import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { WorkShell } from '@/features/shared/work-shell/WorkShell';
import { InstantWorkbench } from '@/features/shared/instant-workbench/InstantWorkbench';
import { GlobalInstantQuote } from '@/features/nx04/quote/ui/GlobalInstantQuote';
import { GlobalInstantInquiry } from '@/features/nx04/quote/ui/GlobalInstantInquiry';

export default function WorkLayout({ children }: { children: ReactNode }) {
  return (
    <WorkShell>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">載入中...</div>}>{children}</Suspense>
      {/* F2 即時工作檯（殼＋各站）＋站 1 主視窗發包的即時報價/詢價浮層 */}
      <InstantWorkbench />
      <GlobalInstantQuote />
      <GlobalInstantInquiry />
    </WorkShell>
  );
}
