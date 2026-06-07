// apps/nx-ui/src/app/dashboard/nx02/page.tsx
// LITE 階段 1 M3-redo-3a：NX02 進貨模組入口 hub
//
// ⚠️ 路線轉換揭露：本檔覆寫舊「庫存 dashboard」舊範式（by-module 時期殘留、
// Nx02DashboardPage 元件保留在 features/nx02/dashboard、後續可改 NX03 庫存）。
//
// NEXORA LITE 藍圖：NX02 = 進貨模組、NX03 才是庫存。

'use client';

import Link from 'next/link';
import {
  ClipboardList,
  FileText,
  Inbox,
  MessageSquare,
  Package,
  PenTool,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-react';

type HubItem = {
  href: string;
  title: string;
  description: string;
  icon: typeof ClipboardList;
  badge?: string;
};

type HubSection = {
  title: string;
  items: HubItem[];
};

// LITE 路由統一（M3-redo-3b）：
// 進貨單據走 /dashboard/nx01/* （真實 service-backed UI、含 RfqDetailView 並排比價）
// 主檔走 /dashboard/base/* （鋼鐵星球範式 EntityMasterPage）
// LITE 階段 1 新功能走 /dashboard/nx02/* 跟 /dashboard/task-pool
const SECTIONS: HubSection[] = [
  {
    title: '採購流程（國內）',
    items: [
      {
        href: '/dashboard/purchase/rfq',
        title: '詢價單 RFQ',
        description: '選料件 + 數量 → 產生詢價文字 → 多家供應商並排比價',
        icon: FileText,
      },
      {
        href: '/dashboard/purchase/po',
        title: '採購單 PO',
        description: '比價選定後開採購單、對象 = 供應商 partner_type=S',
        icon: ShoppingCart,
      },
      {
        href: '/dashboard/purchase/rr',
        title: '進貨單 + 驗收 RR',
        description: '貨到→建單→按「驗收」→自動入庫 + 自動產生應付帳',
        icon: Inbox,
      },
      {
        href: '/dashboard/purchase/pr',
        title: '退貨單 PR',
        description: '驗收發現問題退回供應商（國內 / 國外通用）',
        icon: RotateCcw,
      },
    ],
  },
  {
    title: '進貨延伸功能',
    items: [
      {
        href: '/dashboard/nx02/warranty-claim',
        title: '保固申請單',
        description: '客訴型（連 SO） + 自用型 + 4 種審核結果 + 附件 upload',
        icon: ShieldCheck,
        badge: 'LITE 新',
      },
      {
        href: '/dashboard/nx02/rfq-greeting-template',
        title: '客套話設定',
        description: '詢價文字開頭/結尾客套話、公司自訂',
        icon: MessageSquare,
        badge: 'LITE 新',
      },
    ],
  },
  {
    title: '主檔維護（鋼鐵星球範式）',
    items: [
      {
        href: '/dashboard/base/partners',
        title: '往來對象主檔',
        description: '六分類 C/O/S/T/B/V、含供應商等級「依付款條件重算」',
        icon: Users,
      },
      {
        href: '/dashboard/base/parts',
        title: '零件主檔',
        description: '產品種類 + 公司定價 ABCD「依成本重算」',
        icon: Package,
      },
    ],
  },
  {
    title: '跨模組共用',
    items: [
      {
        href: '/dashboard/task-pool',
        title: '共享待辦池',
        description: '我的待辦 + 部門池、可領取 / 指派、跨模組通用',
        icon: ClipboardList,
        badge: 'LITE 新',
      },
    ],
  },
];

export default function Nx02HubPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
        <h1 className="text-2xl font-semibold text-foreground">進貨管理</h1>
        <p className="text-sm text-muted-foreground">
          詢價 → 採購 → 進貨驗收 → 退貨；含保固申請、供應商/產品維護。LITE 階段 1 入口頁。
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{section.title}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex flex-col gap-2 rounded-xl border border-border/70 bg-card/50 p-4 transition hover:border-primary/40 hover:bg-card/80"
              >
                {item.badge && (
                  <span className="absolute right-3 top-3 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                    {item.badge}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <item.icon className="h-5 w-5 text-primary/80" />
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-xs text-muted-foreground">
        💡 提示：詢價單比價選定供應商後可一鍵開採購單；採購單到貨後開進貨單驗收；驗收完成系統自動寫入庫存（移動平均）+ 自動產生應付帳款。國外進貨用 RR + 提貨單、額外費用按金額比例攤分到每料件成本。
      </div>
    </div>
  );
}
