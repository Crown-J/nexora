/**
 * File: apps/nx-ui/src/app/dashboard/base/page.tsx
 *
 * Purpose:
 * - 主檔管理首頁（路由 v2：`/dashboard/base`）
 * - 渲染主檔 hub 卡片網格（DashboardShell 提供外框與驗證）
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getMasterHubSections } from '@/app/base/master-cards';
import { listUsers } from '@/features/base/api/user';
import { listRoles } from '@/features/base/api/role';
import { listPartners } from '@/features/base/api/partner';
import { listWarehouses } from '@/features/base/api/warehouse';
import { listPart } from '@/features/nx00/part/api/part';
import { listBrand } from '@/features/nx00/brand/api/brand';
import { listCarBrand } from '@/features/nx00/car-brand/api/car-brand';
import { listLocation } from '@/features/nx00/location/api/location';
import { listRoleView } from '@/features/nx00/role-view/api/role-view';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { hubCardShellBaseClass } from '@/shared/lib/hubCardDimensions';
import { cn } from '@/lib/utils';

function fmtCount(n: number): string {
  return `${n.toLocaleString('zh-TW')} 筆`;
}

export default function BaseDashboardPage() {
  const { me, view } = useSessionMe();
  const [hubStats, setHubStats] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (view.loading || !me) return;
    let cancelled = false;
    (async () => {
      try {
        const [u, r, rv, p, carB, partB, wh, loc, pt] = await Promise.all([
          listUsers({ page: 1, pageSize: 1 }),
          listRoles({ page: 1, pageSize: 1 }),
          listRoleView({ page: 1, pageSize: 1 }),
          listPart({ page: 1, pageSize: 1 }),
          listCarBrand({ page: 1, pageSize: 1 }),
          listBrand({ page: 1, pageSize: 1 }),
          listWarehouses({ page: 1, pageSize: 1 }),
          listLocation({ page: 1, pageSize: 1 }),
          listPartners({ page: 1, pageSize: 1 }),
        ]);
        if (cancelled) return;
        setHubStats({
          user: fmtCount(u.total),
          role: fmtCount(r.total),
          'role-view': fmtCount(rv.total),
          part: fmtCount(p.total),
          'brand-masters': `汽 ${fmtCount(carB.total)} · 零 ${fmtCount(partB.total)}`,
          'part-group': '後端未提供 API',
          'warehouse-location': `${wh.total.toLocaleString('zh-TW')} 倉 · ${loc.total.toLocaleString('zh-TW')} 庫位`,
          partner: fmtCount(pt.total),
        });
      } catch {
        if (!cancelled) setHubStats({});
      }
    })();
    return () => { cancelled = true; };
  }, [view.loading, me]);

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">MASTER DATA</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">主檔管理</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          依業務分區排列；摘要數字來自正式 API（登入後載入），點選卡片進入各主檔維護。
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
                const inner = (
                  <div className="flex h-full min-h-0 flex-col gap-1.5">
                    <div className="flex shrink-0 items-start justify-between gap-2">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80',
                          'bg-secondary/50 text-primary',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </div>
                      {!card.links ? (
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className="min-h-0 flex-1 space-y-0.5">
                      <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">{card.title}</h3>
                      <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{card.description}</p>
                    </div>
                    <div className="mt-auto shrink-0 border-t border-border/60 pt-1.5">
                      {!card.links ? (
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{card.statLabel}</p>
                          <p className="text-sm font-semibold tabular-nums leading-tight text-foreground">
                            {hubStats[card.id] ?? card.statValue}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{card.statLabel}</p>
                            <p className="line-clamp-1 text-xs font-semibold tabular-nums leading-tight text-foreground">
                              {hubStats[card.id] ?? card.statValue}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            {card.links.map((l) => (
                              <Link
                                key={l.href}
                                href={l.href}
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  'rounded-lg border border-primary/35 bg-primary/10 px-2 py-1 text-center text-[10px] font-medium text-primary',
                                  'transition-colors hover:bg-primary/18 hover:border-primary/50',
                                )}
                              >
                                {l.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );

                const shellMotion = cn(
                  'transition-all duration-300 ease-out',
                  'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
                );

                if (card.href) {
                  return (
                    <Link
                      key={card.id}
                      href={card.href}
                      className={cn(hubCardShellBaseClass, 'group flex flex-col', shellMotion, 'active:scale-[0.998]', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background')}
                    >
                      {inner}
                    </Link>
                  );
                }

                return (
                  <div key={card.id} className={cn(hubCardShellBaseClass, 'group flex flex-col', shellMotion)}>
                    {inner}
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
