/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-021-F01
 * 首頁左側五鍵快捷列（與行事曆列等高；垂直 space-evenly；圖示 + 鍵名）
 */

'use client';

import { useRouter } from 'next/navigation';
import { DASHBOARD_QUICK_SHORTCUTS } from '@/features/sys-dashboard/config/dashboardQuickShortcuts';
import { cx } from '@/shared/lib/cx';

type Props = {
  className?: string;
  /** 與行事曆／今日事件列同高；未傳時直向 408px、橫向 auto */
  heightClassName?: string;
  /** 直向：左欄；橫向：手機列 */
  orientation?: 'vertical' | 'horizontal';
};

export function DashboardQuickShortcuts({
  className,
  heightClassName,
  orientation = 'vertical',
}: Props) {
  const router = useRouter();
  const isVertical = orientation === 'vertical';
  const dimClass =
    heightClassName ?? (isVertical ? 'h-[408px] min-h-[408px]' : 'h-auto min-h-0');

  return (
    <div
      className={cx(
        'nx-dash-card shrink-0 overflow-hidden p-2',
        dimClass,
        isVertical ? 'flex w-14 flex-col justify-evenly' : 'flex w-full flex-row justify-evenly py-2',
        className,
      )}
      aria-label="首頁預設快捷鍵"
    >
      {DASHBOARD_QUICK_SHORTCUTS.map(({ key, label, href, Icon }) => (
        <button
          key={key}
          type="button"
          title={label}
          aria-label={`${label}（${key.toUpperCase()}）`}
          onClick={() => router.push(href)}
          className={cx(
            'flex flex-col items-center justify-center gap-1 rounded-xl border border-border/70 bg-muted/20 px-1 py-2 text-foreground transition hover:border-primary/40 hover:bg-muted/45',
            !isVertical && 'min-w-0 flex-1',
          )}
        >
          <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <span className="text-center font-mono text-[10px] font-medium leading-none text-muted-foreground">
            {key.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}
