/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/WorkflowStepBar.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 銷售流程橫向步驟條（圓形序號、連接線、待處理徽章；mock 資料驅動）
 *
 * Notes:
 * - Render-only；金色為作用中步驟；已過／未到為灰階
 */

'use client';

import { cx } from '@/shared/lib/cx';
import type { WorkflowStep } from '@/features/nx03/workflow/types';

export interface WorkflowStepBarProps {
  steps: WorkflowStep[];
  activeStep: string;
  onStepClick: (stepId: string) => void;
}

/**
 * @FUNCTION_CODE NX03-WKFL-UI-002-F01
 * 依序渲染步驟節點與連接線，並標示目前步驟（金色高亮）。
 */
export function WorkflowStepBar({ steps, activeStep, onStepClick }: WorkflowStepBarProps) {
  const rawIndex = steps.findIndex((s) => s.id === activeStep);
  const activeIndex = rawIndex === -1 ? 0 : rawIndex;

  return (
    <div
      className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="銷售流程步驟"
    >
      <div className="flex min-w-[min(100%,720px)] items-start sm:min-w-0">
        {steps.map((step, i) => {
          const isActive = step.id === activeStep;
          const isPast = i < activeIndex;
          const isFuture = i > activeIndex;
          return (
            <div key={step.id} className="flex flex-1 items-start">
              <div className="flex min-w-[72px] flex-1 flex-col items-center sm:min-w-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onStepClick(step.id)}
                  className={cx(
                    'flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isActive && 'bg-amber-500/12',
                    !isActive && 'hover:bg-muted/40'
                  )}
                >
                  <span
                    className={cx(
                      'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                      isActive &&
                        'border-amber-400/70 bg-amber-500/20 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]',
                      isPast && !isActive && 'border-border bg-muted/50 text-muted-foreground',
                      isFuture && 'border-border/60 bg-secondary/30 text-muted-foreground/80'
                    )}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={cx(
                      'line-clamp-2 text-center text-[11px] font-medium leading-tight sm:text-xs',
                      isActive && 'text-amber-50',
                      !isActive && isPast && 'text-muted-foreground',
                      isFuture && 'text-muted-foreground/75'
                    )}
                  >
                    {step.label}
                  </span>
                  {step.count != null ? (
                    <span
                      className={cx(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                        isActive && 'bg-amber-500/25 text-amber-100',
                        !isActive && 'bg-muted/60 text-muted-foreground'
                      )}
                    >
                      {step.count}
                    </span>
                  ) : null}
                </button>
              </div>
              {i < steps.length - 1 ? (
                <div
                  className={cx(
                    'mt-[18px] h-px min-w-[8px] max-w-[36px] flex-1 shrink',
                    i < activeIndex ? 'bg-amber-500/45' : 'bg-border'
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
