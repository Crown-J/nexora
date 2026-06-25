// apps/nx-ui/src/design/components/page-header/PageHeader.tsx
// 頁面標題列
// 2026-06-18 執行長範式：純麵包屑（不可點）+ count chip
//   - auto-gen crumbs:[主檔, category, title] 三段
//   - 最後一段 = title、gold 高亮
//   - 全段純文字不可點（因為「主檔」/「組織架構」沒獨立頁、無連結意義）
//   - 拔掉大標題 h1（麵包屑最後一段已經是標題）
//   - count chip 移到麵包屑同行最右
//   - desc 保留下方一行
'use client';

import { Fragment, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@design/utils/cn';

export type Crumb = { label: string };

export type PageHeaderProps = {
  /** 麵包屑列；若無傳、且有 category + title、自動生成 [{主檔}, {category}, {title}] */
  crumbs?: Crumb[];
  /** 自動麵包屑第二段：例如「組織架構」 */
  category?: string;
  /** 自動麵包屑最後一段 = 頁面標題 */
  title: string;
  /** 一行描述、max 760px（optional） */
  desc?: string;
  /** 右側計數 chip（如「24 筆」）*/
  count?: string;
  /** 2026-06-25：右側附加 slot（如 MasterQuickNav 主檔切換按鈕）、放在 count 右邊 */
  rightAddon?: ReactNode;
  className?: string;
};

export function PageHeader({
  crumbs,
  category,
  title,
  desc,
  count,
  rightAddon,
  className,
}: PageHeaderProps) {
  const effective: Crumb[] =
    crumbs ??
    [
      { label: '主檔' },
      ...(category ? [{ label: category }] : []),
      { label: title },
    ];

  return (
    <div data-nx-frame className={cn('flex flex-col gap-[6px] px-4 py-3', className)}>
      <div className="flex items-center gap-[8px]">
        <nav className="flex min-w-0 flex-1 items-center gap-[7px] text-xs">
          {effective.map((c, i) => {
            const isLast = i === effective.length - 1;
            return (
              <Fragment key={`${c.label}-${i}`}>
                {i > 0 ? (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
                ) : null}
                <span
                  className={cn(
                    'truncate',
                    isLast
                      ? 'font-semibold text-[#E8A020]'
                      : 'text-muted-foreground',
                  )}
                >
                  {c.label}
                </span>
              </Fragment>
            );
          })}
        </nav>
        {count ? (
          <span className="shrink-0 rounded-md border border-border/40 bg-background/40 px-2 py-1 text-[11px] font-mono tabular-nums text-muted-foreground">
            {count}
          </span>
        ) : null}
        {rightAddon ? <div className="flex shrink-0 items-center gap-2">{rightAddon}</div> : null}
      </div>

      {desc ? (
        <p className="max-w-[760px] text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
      ) : null}
    </div>
  );
}
