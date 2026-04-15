/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-021-F02
 * 首頁區塊一：全寬橫向快捷鍵（圖示 + 鍵名，hover tooltip）
 */

'use client';

import { useRouter } from 'next/navigation';
import { DASHBOARD_QUICK_SHORTCUTS } from '@/features/sys-dashboard/config/dashboardQuickShortcuts';
import { cx } from '@/shared/lib/cx';

type Props = {
  className?: string;
};

export function DashboardQuickShortcuts({ className }: Props) {
  const router = useRouter();

  return (
    <div
      className={cx(
        'flex w-full shrink-0 flex-row justify-evenly gap-2 rounded-xl border border-border/50 bg-card/30 px-2 py-2.5 backdrop-blur-sm',
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
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-transparent px-1 py-1.5 text-foreground transition hover:border-border/80 hover:bg-muted/30"
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
