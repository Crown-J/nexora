// apps/nx-ui/src/design/components/page-header/PageHeader.tsx
// 頁面標題列（對齊 Hana demo .nx-page-head）
// - 麵包屑（最後一段 gold 高亮、可點跳前段）
// - 標題 h1 23px 粗體
// - kind 小 tag chip（gold border）
// - desc 一行描述（13px muted、max 760px）
// - count 右上 chip
//
// 麵包屑點擊用 tryNavigate 帶 dirty 攔截、不用 next/link（避免繞過 dirty 守門）
'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { tryNavigate } from '@design/hooks/useDirtyGuard';
import { cn } from '@design/utils/cn';

export type Crumb = { label: string; href?: string };

export type PageHeaderProps = {
  /** 麵包屑列；若無傳、且有 category、自動生成 [{主檔}, {category}] */
  crumbs?: Crumb[];
  /** Backward compat:7 個既有 page 用 category。對應 crumbs auto-gen 第二段 */
  category?: string;
  /** 主標題 */
  title: string;
  /** 小分類 chip（gold border、optional）*/
  kind?: string;
  /** 一行描述、max 760px */
  desc?: string;
  /** 右上計數 chip（如「24 筆」）*/
  count?: string;
  className?: string;
};

export function PageHeader({
  crumbs,
  category,
  title,
  kind,
  desc,
  count,
  className,
}: PageHeaderProps) {
  const router = useRouter();
  const effective =
    crumbs ??
    (category
      ? [{ label: '主檔', href: '/dashboard/master' }, { label: category }]
      : []);

  return (
    <div className={cn('flex flex-col gap-[7px] px-4 py-3', className)}>
      {effective.length > 0 ? (
        <nav className="flex items-center gap-[7px] text-xs text-muted-foreground">
          {effective.map((c, i) => {
            const isLast = i === effective.length - 1;
            return (
              <Fragment key={`${c.label}-${i}`}>
                {i > 0 ? (
                  <ChevronRight className="size-3 text-muted-foreground/50" />
                ) : null}
                {c.href && !isLast ? (
                  <button
                    type="button"
                    onClick={() => {
                      const href = c.href!;
                      tryNavigate(() => router.push(href));
                    }}
                    className="hover:text-foreground"
                  >
                    {c.label}
                  </button>
                ) : (
                  <span className={isLast ? 'font-semibold text-[#E8A020]' : ''}>
                    {c.label}
                  </span>
                )}
              </Fragment>
            );
          })}
        </nav>
      ) : null}

      <div className="flex items-baseline gap-3">
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">{title}</h1>
        {kind ? (
          <span className="rounded border border-[#E8A020]/40 px-2 py-[2px] text-[11px] font-semibold text-[#E8A020]">
            {kind}
          </span>
        ) : null}
        {count ? (
          <span className="ml-auto shrink-0 rounded-md border border-border/40 bg-background/40 px-2 py-1 text-[11px] font-mono tabular-nums text-muted-foreground">
            {count}
          </span>
        ) : null}
      </div>

      {desc ? (
        <p className="max-w-[760px] text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
      ) : null}
    </div>
  );
}
