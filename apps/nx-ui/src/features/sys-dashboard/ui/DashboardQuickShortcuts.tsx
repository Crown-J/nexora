/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-021-F03
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
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-transparent px-2 py-2 text-foreground transition hover:bg-[#E8A020]/14"
        >
          <Icon className="h-6 w-6 shrink-0 text-[#E8A020]" aria-hidden />
          <span className="text-center font-mono text-sm font-semibold leading-none text-[#E8A020]">
            {key.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}
