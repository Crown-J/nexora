// apps/nx-ui/src/design/components/page-header/PageHeader.tsx
// 頁面標題列：分類 + 標題 + 計數
// Phase 2 取代退場的 MasterTopBar 中段（其他功能：模組選單/公告/通知/使用者已由 UnifiedTopBar 提供）
'use client';

import { cn } from '@design/utils/cn';

export function PageHeader({
  category,
  title,
  count,
  className,
}: {
  category?: string;
  title: string;
  count?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline gap-3 border-b border-border/40 px-4 py-2',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {category ? (
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            {category}
          </div>
        ) : null}
        <h1 className="truncate text-sm font-bold tracking-wide text-foreground">{title}</h1>
      </div>
      {count ? (
        <span className="shrink-0 rounded-md border border-border/40 bg-background/40 px-2 py-1 text-[11px] font-mono tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
    </div>
  );
}
