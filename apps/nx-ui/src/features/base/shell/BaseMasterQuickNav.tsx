/**
 * File: apps/nx-ui/src/features/base/shell/BaseMasterQuickNav.tsx
 *
 * Purpose:
 * - 主檔子頁標題列右側圖示捷徑，與 /base hub 卡片一致，免回總覽即可切換
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MASTER_HUB_CARDS } from '@/app/base/master-cards';
import { cn } from '@/lib/utils';

function pathMatchesHub(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  return false;
}

export function BaseMasterQuickNav() {
  const pathname = usePathname() || '';

  return (
    <nav className="flex flex-wrap items-center justify-end gap-1" aria-label="主檔快速切換">
      {MASTER_HUB_CARDS.map((card) => {
        const href = card.href;
        if (!href) return null;
        const Icon = card.icon;
        const active = pathMatchesHub(pathname, href);
        return (
          <Link
            key={card.id}
            href={href}
            title={card.title}
            aria-label={`切換至${card.title}主檔`}
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
    </nav>
  );
}
