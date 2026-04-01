/**
 * File: apps/nx-ui/src/app/base/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 主檔入口 hub：與 /home 相同 Landing 外殼 + 主檔卡片網格（測試資料）
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { HomeTopBar } from '@/components/home/top-bar';
import { HomeLandingChrome } from '@/components/home/home-landing-chrome';
import { cn } from '@/lib/utils';
import { MASTER_HUB_CARDS } from '@/app/base/master-cards';
import { listUsers } from '@/features/base/api/user';
import { listRoles } from '@/features/base/api/role';
import { listPartners } from '@/features/base/api/partner';
import { listWarehouses } from '@/features/base/api/warehouse';
import { listPart } from '@/features/nx00/part/api/part';
import { listBrand } from '@/features/nx00/brand/api/brand';
import { listLocation } from '@/features/nx00/location/api/location';
import { listRoleView } from '@/features/nx00/role-view/api/role-view';

function fmtCount(n: number): string {
  return `${n.toLocaleString('zh-TW')} 筆`;
}

export default function BaseMasterHubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { me, displayName, tenantNameZh, tenantNameEn, logout, view } = useSessionMe();
  const [hubStats, setHubStats] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (!view.loading && !me) router.replace('/login');
  }, [me, router, view.loading]);

  /** Esc：主檔 hub（/base）返回首頁 /home；子頁由各自 MasterView 處理至 /base */
  useEffect(() => {
    if (pathname !== '/base') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      router.push('/home');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  useEffect(() => {
    if (view.loading || !me) return;
    let cancelled = false;
    (async () => {
      try {
        const [u, r, rv, p, b, wh, loc, pt] = await Promise.all([
          listUsers({ page: 1, pageSize: 1 }),
          listRoles({ page: 1, pageSize: 1 }),
          listRoleView({ page: 1, pageSize: 1 }),
          listPart({ page: 1, pageSize: 1 }),
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
          brand: fmtCount(b.total),
          'part-group': '後端未提供 API',
          'warehouse-location': `${wh.total.toLocaleString('zh-TW')} 倉 · ${loc.total.toLocaleString('zh-TW')} 庫位`,
          partner: fmtCount(pt.total),
        });
      } catch {
        if (!cancelled) setHubStats({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view.loading, me]);

  if (view.loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">載入中…</div>
      </div>
    );
  }

  if (view.errorMsg) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-lg">
          <div className="text-xs tracking-[0.35em] text-muted-foreground">NEXORA</div>
          <div className="mt-2 text-lg font-semibold text-foreground">Session error</div>
          <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{view.errorMsg}</div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs text-foreground hover:bg-secondary/80 transition"
            >
              前往登入
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary hover:bg-primary/15 transition"
            >
              登出
            </button>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">checkedAt: {view.checkedAt || '—'}</div>
        </div>
      </div>
    );
  }

  const nameText = displayName || me?.username || '系統管理員';

  return (
    <HomeLandingChrome
      topBar={
        <HomeTopBar
          displayName={nameText}
          roleLabel="使用者"
          onLogout={logout}
          onOpenDashboard={() => router.push('/dashboard')}
          tenantNameZh={tenantNameZh || null}
          tenantNameEn={tenantNameEn || null}
        />
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <header className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">MASTER DATA</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">主檔管理</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            摘要數字來自正式 API（登入後載入）；點選卡片進入各主檔維護。
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {MASTER_HUB_CARDS.map((card) => {
            const Icon = card.icon;
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/80',
                      'bg-secondary/50 text-primary',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  {!card.links ? (
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="mt-4 space-y-1">
                  <h2 className="text-base font-semibold text-foreground">{card.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-border/60 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.statLabel}</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {hubStats[card.id] ?? card.statValue}
                    </p>
                  </div>
                  {card.links ? (
                    <div className="flex flex-wrap gap-2">
                      {card.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className={cn(
                            'rounded-xl border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary',
                            'transition-colors hover:bg-primary/18 hover:border-primary/50',
                          )}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            );

            if (card.href) {
              return (
                <Link
                  key={card.id}
                  href={card.href}
                  className={cn(
                    'group glass-card block rounded-2xl border border-border/80 p-5 text-left shadow-sm',
                    'transition-all duration-300 ease-out',
                    'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    'active:scale-[0.998]',
                  )}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <div
                key={card.id}
                className={cn(
                  'group glass-card rounded-2xl border border-border/80 p-5 shadow-sm',
                  'transition-all duration-300 ease-out',
                  'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
                )}
              >
                {inner}
              </div>
            );
          })}
        </section>
      </div>
    </HomeLandingChrome>
  );
}
