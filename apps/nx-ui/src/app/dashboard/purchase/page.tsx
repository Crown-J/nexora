/**
 * File: apps/nx-ui/src/app/dashboard/purchase/page.tsx
 *
 * Purpose:
 * - 採購管理首頁（路由 v2：`/dashboard/purchase`）
 * - 卡片式模組入口，Mock 資料，未串接後端
 */

'use client';

import Link from 'next/link';
import { ChevronRight, ShoppingCart, Globe, Zap, SlidersHorizontal, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type PurchaseCard = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  statLabel: string;
  statValue: string;
  plusOnly?: boolean;
};

type PurchaseSection = {
  id: string;
  title: string;
  cards: PurchaseCard[];
};

const PURCHASE_SECTIONS: PurchaseSection[] = [
  {
    id: 'operations',
    title: '採購作業',
    cards: [
      {
        id: 'domestic',
        title: '國內採購作業',
        description: 'RFQ 詢價 → PO 採購 → RR 驗收，完整國內進貨流程管理',
        icon: ShoppingCart,
        href: '/dashboard/purchase/domestic',
        statLabel: '本月待處理',
        statValue: '12 張',
      },
      {
        id: 'import',
        title: '國外採購作業',
        description: '國外進貨詢價、PO 下單與報關驗收作業',
        icon: Globe,
        href: '/dashboard/purchase/import',
        statLabel: '版本需求',
        statValue: 'PLUS+',
        plusOnly: true,
      },
      {
        id: 'special',
        title: '特殊採購（掃貨）',
        description: '緊急採購、市場掃貨與臨時進貨作業',
        icon: Zap,
        href: '/dashboard/purchase/special',
        statLabel: '進行中',
        statValue: '0 張',
      },
    ],
  },
  {
    id: 'data',
    title: '資料維護',
    cards: [
      {
        id: 'product',
        title: '產品管理',
        description: '料號定價、安全庫存量與採購條件設定',
        icon: SlidersHorizontal,
        href: '/dashboard/purchase/product',
        statLabel: '管理料號',
        statValue: '186 筆',
      },
      {
        id: 'vendor',
        title: '廠商管理',
        description: '供應商基本資料、聯絡窗口與採購合約維護',
        icon: Building2,
        href: '/dashboard/purchase/vendor',
        statLabel: '廠商總數',
        statValue: '24 家',
      },
    ],
  },
];

export default function PurchaseHubPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">PURCHASE</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">採購管理</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          管理詢價、採購訂單、進貨驗收及廠商資料。選擇作業工作台或維護項目進入。
        </p>
      </header>

      <div className="space-y-10">
        {PURCHASE_SECTIONS.map((section) => (
          <section
            key={section.id}
            className="space-y-4"
            aria-labelledby={`purchase-section-${section.id}`}
          >
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 pb-2">
              <h2
                id={`purchase-section-${section.id}`}
                className="text-sm font-semibold tracking-wide text-foreground"
              >
                {section.title}
              </h2>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {section.cards.length} 項
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.cards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.id}
                    href={card.href}
                    className={cn(
                      'group glass-card block rounded-2xl border border-border/80 p-5 text-left shadow-sm',
                      'transition-all duration-300 ease-out',
                      'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/35',
                      'hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      'active:scale-[0.998]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                          'border border-border/80 bg-secondary/50 text-primary',
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="flex items-center gap-2">
                        {card.plusOnly ? (
                          <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            PLUS
                          </span>
                        ) : null}
                        <ChevronRight
                          className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                          aria-hidden
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-1">
                      <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-2 border-t border-border/60 pt-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {card.statLabel}
                        </p>
                        <p className="text-lg font-semibold tabular-nums text-foreground">
                          {card.statValue}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
