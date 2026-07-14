/**
 * File: apps/nx-ui/src/app/dashboard/layout.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-006：Dashboard Layout（統一套用 Shell 版面）
 *
 * Notes:
 * - Dashboard 下所有頁面都會套用：HomeLandingChrome（星空背景）+ HomeTopBar（星球模組選單、主模組 Tabs）+ 橫向次選單 + 內容框
 * - ✅ App Router 的 layout 預設是 Server Component：
 *   - 不要加 'use client'（避免整個 dashboard 變成 client boundary）
 * - ✅ 在 layout 內不要用 usePathname / hooks
 *   - 改用 Segment/Path 由 client component（DashboardShell）自己判斷
 *   - 或者在這裡單純包殼，把右側 title 交給 children/page 自己提供（之後可做 config/breadcrumb）
 */

import type { ReactNode } from 'react';
import { Suspense } from 'react';
// 2026-06-27 大改版：太空風 DashboardShell 封存、改傳統 ERP 外殼 WorkbenchShell
import { WorkbenchShell } from '@design/layout/workbench/WorkbenchShell';
import { GlobalInstantQuote } from '@/features/nx04/quote/ui/GlobalInstantQuote';
import { GlobalInstantInquiry } from '@/features/nx04/quote/ui/GlobalInstantInquiry';
import { InstantWorkbench } from '@/features/shared/instant-workbench/InstantWorkbench';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WorkbenchShell>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">載入中...</div>}>{children}</Suspense>
      {/* F2 即時工作檯（執行長 2026-07-14 收殼拍板）：站1 庫存查詢（原 F1）＋站2 即時報價（原 F2）
          ＋站3 調貨詢價（原 F5、F1/F5 已釋出還瀏覽器）、裸數字切站、站4 補貨 C 期 */}
      <InstantWorkbench />
      {/* 即時報價（單顆/批次）：聽站 1 主視窗發的 nx-instant-quote 事件（Step5B）*/}
      <GlobalInstantQuote />
      {/* 即時詢價：聽站 1 主視窗發的 nx-instant-inquiry 事件（調貨側 B1）*/}
      <GlobalInstantInquiry />
    </WorkbenchShell>
  );
}