/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-021-F06
 * 首頁區塊一：全寬橫向快捷鍵（Lucide 圖示 + 中文 + kbd，圖示區對齊 Dock 選單列）
 */

'use client';

import { useRouter } from 'next/navigation';
import { getDashboardQuickShortcuts } from '@/features/sys-dashboard/config/dashboardQuickShortcuts';
import { useDashboardHomePlan } from '@/features/sys-dashboard/context/DashboardHomePlanContext';
import { cx } from '@/shared/lib/cx';

type Props = {
  className?: string;
};

export function DashboardQuickShortcuts({ className }: Props) {
  const router = useRouter();
  const { planCode } = useDashboardHomePlan();
  const shortcuts = getDashboardQuickShortcuts(planCode);

  return (
    <div
      className={cx(
        'nx-dash-card flex w-full shrink-0 flex-row flex-wrap items-stretch gap-1.5 p-2 sm:flex-nowrap sm:gap-2 sm:p-2.5',
        className,
      )}
      aria-label="首頁預設快捷鍵"
    >
      {shortcuts.map(({ key, label, href, Icon }) => (
        <button
          key={key}
          type="button"
          title={`${label}（${key.toUpperCase()}）`}
          aria-label={`${label}（${key.toUpperCase()}）`}
          onClick={() => router.push(href)}
          className={cx(
            'group relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3',
            'border border-border/50 bg-gradient-to-b from-muted/45 to-muted/10',
            'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
            'transition-[border-color,box-shadow,background-color,transform] duration-200 ease-out',
            'hover:border-primary/45',
            'hover:bg-gradient-to-b hover:from-primary/22 hover:to-primary/8',
            'hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_4px_16px_-6px_rgba(232,160,32,0.4)]',
            'active:scale-[0.99]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden
          />
          <span
            className={cx(
              'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/45 text-muted-foreground',
              'transition-[border-color,background-color,color] duration-200',
              'group-hover:border-primary/45 group-hover:bg-primary/10 group-hover:text-primary',
            )}
            aria-hidden
          >
            <Icon className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" strokeWidth={1.65} />
          </span>
          <span className="relative min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground transition-colors group-hover:text-primary sm:text-sm">
            {label}
          </span>
          <kbd
            className={cx(
              'relative shrink-0 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary/90',
              'transition-[border-color,background-color,color] duration-200',
              'group-hover:border-primary/45 group-hover:bg-primary/15 group-hover:text-primary',
            )}
          >
            {key.toUpperCase()}
          </kbd>
        </button>
      ))}
    </div>
  );
}
