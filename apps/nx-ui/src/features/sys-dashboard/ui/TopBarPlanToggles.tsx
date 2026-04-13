/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-022-F01
 * 頂欄中央：Mock 方案 LITE / PLUS / PRO（正式版可移除，改由租戶方案決定）
 */

'use client';

import { cn } from '@/lib/utils';
import type { PlanCode } from '@/mocks/dashboard';
import { useDashboardHomePlan } from '@/features/sys-dashboard/context/DashboardHomePlanContext';

export function TopBarPlanToggles() {
  const { planCode, setPlanCode } = useDashboardHomePlan();

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
