/**
 * File: apps/nx-ui/src/features/base/shell/BaseMasterQuickNav.tsx
 *
 * Purpose:
 * - 主檔子頁標題列右側圖示捷徑，與 /base hub 卡片一致，免回總覽即可切換
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getMasterHubSections } from '@/features/base/config/master-cards';
import { cn } from '@/lib/utils';

function pathMatchesHub(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  return false;
}

export function BaseMasterQuickNav() {
  const pathname = usePathname() || '';

  const sections = getMasterHubSections();

  return (
    <nav className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1" aria-label="主檔快速切換">
      {sections.map((group, gi) => (
        <div key={group.id} className="flex flex-wrap items-center gap-1">
          {gi > 0 ? (
            <div
              className="mx-0.5 hidden h-6 w-px shrink-0 bg-border/70 sm:block"
              aria-hidden
              title={group.title}
            />
          ) : null}
          {group.cards.map((card) => {
            const Icon = card.icon;
            const active = pathMatchesHub(pathname, card.href);
            return (
              <Link
                key={card.id}
                href={card.href}
                title={`${group.title}：${card.title}`}
                aria-label={`切換至${card.title}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex size-9 items-center justify-center rounded-lg border transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border bg-card/55 text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-foreground',
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
