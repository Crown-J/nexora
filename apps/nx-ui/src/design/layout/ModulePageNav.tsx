/**
 * File: apps/nx-ui/src/features/layout/ui/ModulePageNav.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 公版模組頁面橫向導覽列（套用於所有模組子頁面）
 * - 左側：返回模組首頁按鈕；右側：各子頁面按鈕（含圖示）
 *
 * Usage:
 *   <ModulePageNav items={PURCHASE_NAV_ITEMS} backHref="/dashboard/purchase" backLabel="採購首頁" />
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ModuleNavItem = {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  /** PLUS 版以上才可用 */
  plusOnly?: boolean;
  /** 停用（灰色不可點） */
  disabled?: boolean;
};

type ModulePageNavProps = {
  items: ModuleNavItem[];
  /** 返回按鈕目標路由（模組首頁 Hub）*/
  backHref?: string;
  /** 返回按鈕文字，預設「返回首頁」*/
  backLabel?: string;
  className?: string;
};

export function ModulePageNav({ items, backHref, backLabel = '返回首頁', className }: ModulePageNavProps) {
  const pathname = usePathname() ?? '';

  return (
    <nav
      aria-label="模組頁面導覽"
      className={cn(
        'flex items-center justify-between gap-3 border-b border-border/60 pb-4',
        className,
      )}
    >
      {/* 左側：返回首頁 */}
      <div className="shrink-0">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-secondary/60 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {backLabel}
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* 右側：子頁面按鈕列 */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <span
                key={item.key}
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground/60"
              >
                {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'border-primary/45 bg-primary/12 text-primary'
                  : 'border-border/80 bg-card/50 text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
              {item.label}
              {item.plusOnly ? (
                <span className="rounded border border-primary/30 bg-primary/10 px-1 py-0 text-[9px] font-semibold leading-[14px] text-primary">
                  PLUS
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
