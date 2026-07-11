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
import { GlobalPartQuickSearch } from '@design/components/quick-search/GlobalPartQuickSearch';
import { GlobalInstantQuote } from '@/features/nx04/quote/ui/GlobalInstantQuote';
import { GlobalInstantInquiry } from '@/features/nx04/quote/ui/GlobalInstantInquiry';
import { GlobalQuoteSession } from '@/features/nx04/quote/ui/GlobalQuoteSession';
import { GlobalTransferInquiry } from '@/features/nx04/quote/ui/GlobalTransferInquiry';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WorkbenchShell>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">載入中...</div>}>{children}</Suspense>
      {/* F1 全域即時庫存查詢（原 F2、執行長 2026-07-11 夜 F1/F2 分流）*/}
      <GlobalPartQuickSearch />
      {/* F2 即時報價查詢工作台（客戶錨定連續報價、執行長 2026-07-11 夜拍板）*/}
      <GlobalQuoteSession />
      {/* F5 即時調貨詢價視窗（吃 F2 Alt+D 的調貨清單、執行長 2026-07-12 拍板）*/}
      <GlobalTransferInquiry />
      {/* 即時報價（單顆/批次）：聽 F1 主視窗發的 nx-instant-quote 事件（Step5B）*/}
      <GlobalInstantQuote />
      {/* 即時詢價：聽 F1 主視窗發的 nx-instant-inquiry 事件（調貨側 B1）*/}
      <GlobalInstantInquiry />
    </WorkbenchShell>
  );
}