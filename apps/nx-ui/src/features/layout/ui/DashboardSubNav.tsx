/**
 * File: apps/nx-ui/src/features/layout/ui/DashboardSubNav.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Dashboard 次功能導覽（橫向），與舊版 SideMenu 同源設定，改為新系統語意色票
 */

'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { resolveSideMenuGroups } from '@/features/layout/config/side-menu';
import { cn } from '@/lib/utils';

function isPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function DashboardSubNav() {
  const pathname = usePathname() ?? '';
  const groups = useMemo(() => resolveSideMenuGroups(pathname), [pathname]);

  if (!groups.length) return null;

  return (
    <nav aria-label="模組次選單" className="space-y-3 border-b border-border/60 pb-4">
      {groups.map((g) => (
        <div key={g.group} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
          <span className="shrink-0 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {g.group}
          </span>
          <div className="flex min-w-0 flex-wrap gap-2">
            {g.items.map((it) => {
              const isDisabled = !!it.disabled || !it.href;
              const active = !!it.href && isPathActive(pathname, it.href);
              if (isDisabled) {
                return (
                  <span
                    key={it.key}
                    className="cursor-not-allowed rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground/70"
                  >
                    {it.label}
                  </span>
                );
              }
              return (
                <Link
                  key={it.key}
                  href={it.href!}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary/45 bg-primary/12 text-primary'
                      : 'border-border/80 bg-card/50 text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground',
                  )}
                >
                  {it.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
