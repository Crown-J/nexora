// apps/nx-ui/src/features/home-dashboard/HomeSectionHeader.tsx
// 對齊主檔中心 HubSectionHeader 範式：底線 + 左標題 + 右計數

'use client';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type HomeSectionHeaderProps = {
  Icon?: LucideIcon;
  title: string;
  count?: string;
  className?: string;
};

export function HomeSectionHeader({ Icon, title, count, className }: HomeSectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-2 border-b border-border/70 pb-2',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} /> : null}
        <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
      </div>
      {count ? <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span> : null}
    </div>
  );
}
