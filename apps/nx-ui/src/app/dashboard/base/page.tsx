/**
 * File: apps/nx-ui/src/app/dashboard/base/page.tsx
 *
 * Purpose:
 * - 主檔管理首頁（路由 v2：`/dashboard/base`）
 * - Hub 卡片統一尺寸（hubCardDimensions）；卡片僅圖示＋標題，雙入口卡另附連結按鈕
 */

'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getMasterHubSections } from '@/app/base/master-cards';
import { hubCardShellBaseClass } from '@/shared/lib/hubCardDimensions';
import { cn } from '@/lib/utils';

export default function BaseDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">MASTER DATA</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">主檔管理</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          依業務分區排列；點選卡片進入各主檔維護。
        </p>
      </header>

      <div className="space-y-10">
        {getMasterHubSections().map((group) => (
          <section key={group.id} className="space-y-4" aria-labelledby={`hub-section-${group.id}`}>
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 pb-2">
              <h2 id={`hub-section-${group.id}`} className="text-sm font-semibold tracking-wide text-foreground">
                {group.title}
              </h2>
              <span className="text-[11px] text-muted-foreground tabular-nums">{group.cards.length} 項</span>
            </div>
            <div className="flex flex-wrap justify-start gap-6">
              {group.cards.map((card) => {
                const Icon = card.icon;

                const shellMotion = cn(
                  'transition-all duration-300 ease-out',
                  'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
                );

                if (card.href) {
                  return (
                    <Link
                      key={card.id}
                      href={card.href}
                      className={cn(
                        hubCardShellBaseClass,
                        'group flex flex-col',
                        shellMotion,
                        'active:scale-[0.998]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      )}
                    >
                      <div className="flex shrink-0 items-start justify-between gap-2">
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80',
                            'bg-secondary/50 text-primary',
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                          aria-hidden
                        />
                      </div>
                      <div className="flex min-h-0 flex-1 items-center pt-2">
                        <h3 className="line-clamp-3 text-sm font-semibold leading-snug text-foreground">{card.title}</h3>
                      </div>
                    </Link>
                  );
                }

                return (
                  <div
                    key={card.id}
                    className={cn(hubCardShellBaseClass, 'group flex flex-col', shellMotion)}
                  >
                    <div className="flex shrink-0 items-start justify-between gap-2">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80',
                          'bg-secondary/50 text-primary',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </div>
                    </div>
                    <h3 className="line-clamp-2 shrink-0 pt-2 text-sm font-semibold leading-snug text-foreground">
                      {card.title}
                    </h3>
                    {card.links ? (
                      <div className="mt-auto flex flex-col gap-1.5 pt-2">
                        {card.links.map((l) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            className={cn(
                              'rounded-lg border border-primary/35 bg-primary/10 px-2 py-1.5 text-center text-[10px] font-medium text-primary',
                              'transition-colors hover:bg-primary/18 hover:border-primary/50',
                            )}
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
