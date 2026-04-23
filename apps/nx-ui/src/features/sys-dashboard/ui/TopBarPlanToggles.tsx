/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-022-F01
 * 頂欄中央：Mock 方案 LITE / PLUS / PRO（正式版可移除，改由租戶方案決定）
 *
 * Demo mode：預設隱藏（demo 時由登入租戶決定方案）；
 * 若需恢復切換，設定環境變數 NEXT_PUBLIC_SHOW_VERSION_SWITCHER=true。
 */

'use client';

import { cn } from '@/lib/utils';
import type { PlanCode } from '@/mocks/dashboard';
import { useDashboardHomePlan } from '@/features/sys-dashboard/context/DashboardHomePlanContext';

export function TopBarPlanToggles() {
  // hook 必須先呼叫，確保 Provider / Context state 維持一致
  const { planCode, setPlanCode } = useDashboardHomePlan();

  if (process.env.NEXT_PUBLIC_SHOW_VERSION_SWITCHER !== 'true') {
    return null;
  }

  return (
    <div
      className="flex flex-nowrap items-center gap-1 sm:gap-1.5"
      role="group"
      aria-label="方案版型（Mock 驗收用）"
    >
      {(['LITE', 'PLUS', 'PRO'] as const).map((p: PlanCode) => (
        <button
          key={p}
          type="button"
          onClick={() => setPlanCode(p)}
          className={cn(
            'shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold tracking-wide transition sm:px-2.5 sm:py-1.5 sm:text-[11px]',
            planCode === p
              ? 'border-primary/50 bg-primary/12 text-primary ring-1 ring-primary/20'
              : 'border-border bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
