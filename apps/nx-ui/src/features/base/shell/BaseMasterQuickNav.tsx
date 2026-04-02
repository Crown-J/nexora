/**
 * File: apps/nx-ui/src/features/base/shell/BaseMasterQuickNav.tsx
 *
 * Purpose:
 * - 主檔子頁標題列右側圖示捷徑，與 /base hub 卡片一致，免回總覽即可切換
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { getMasterHubSections } from '@/app/base/master-cards';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

            if (card.links?.length) {
              const active = card.links.some((l) => pathMatchesHub(pathname, l.href));
              return (
                <DropdownMenu key={card.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title={`${group.title}：${card.title}`}
                      aria-label={`${card.title}：選擇子主檔`}
                      className={cn(
                        'inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-px rounded-lg border px-1 transition-colors',
                        active
                          ? 'border-primary/50 bg-primary/15 text-primary'
                          : 'border-border bg-card/55 text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-foreground',
                      )}
                    >
                      <Icon className="size-[18px] shrink-0" aria-hidden />
                      <ChevronDown className="size-2.5 shrink-0 opacity-70" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[10rem]">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {group.title} · {card.title}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {card.links.map((l) => {
                      const subActive = pathMatchesHub(pathname, l.href);
                      return (
                        <DropdownMenuItem key={l.href} asChild className={subActive ? 'bg-primary/10' : undefined}>
                          <Link href={l.href} aria-current={subActive ? 'page' : undefined}>
                            {l.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            const href = card.href;
            if (!href) return null;
            const active = pathMatchesHub(pathname, href);
            return (
              <Link
                key={card.id}
                href={href}
                title={`${group.title}：${card.title}`}
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
        </div>
      ))}
    </nav>
  );
}
