/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/WorkflowStepPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 單一步驟內容面板：標題、CTA、單據卡片列表（mock）
 *
 * Notes:
 * - statusVariant 對應四色徽章；無單據時顯示空狀態
 */

'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { cx } from '@/shared/lib/cx';
import type { DocCard, SalesPath } from '@/features/nx03/workflow/types';
import { getStepsForPath } from '@/features/nx03/workflow/mock/workflow.mock';

export interface WorkflowStepPanelProps {
  stepId: string;
  activePath: SalesPath;
  docs: DocCard[];
}

/**
 * @FUNCTION_CODE NX03-WKFL-UI-003-F01
 * 依 statusVariant 回傳徽章 class（黃／藍／綠／灰）。
 */
function statusBadgeClass(variant: DocCard['statusVariant']): string {
  switch (variant) {
    case 'pending':
      return 'border-amber-600/35 bg-amber-300/90 text-amber-950 dark:bg-amber-500/25 dark:text-amber-50';
    case 'replied':
      return 'border-blue-600/35 bg-blue-400/80 text-blue-950 dark:bg-blue-500/20 dark:text-blue-100';
    case 'confirmed':
      return 'border-emerald-600/35 bg-emerald-400/80 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100';
    case 'done':
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

/**
 * @FUNCTION_CODE NX03-WKFL-UI-003-F02
 * 待處理筆數：不含 statusVariant === done。
 */
function countPending(docs: DocCard[]): number {
  return docs.filter((d) => d.statusVariant !== 'done').length;
}

/**
 * @FUNCTION_CODE NX03-WKFL-UI-003-F03
 * 依 stepId 決定右上角 CTA；無則不顯示。
 */
function StepCta({
  stepId,
  onStock,
  onRfq,
  onQuote,
  onSo,
}: {
  stepId: string;
  onStock: () => void;
  onRfq: () => void;
  onQuote: () => void;
  onSo: () => void;
}) {
  if (stepId === 'stock') {
    return (
      <button
        type="button"
        onClick={onStock}
        className={cx(
          'shrink-0 rounded-xl border border-amber-500/35 bg-amber-500/15 px-4 py-2.5 text-sm font-medium text-amber-50',
          'transition-colors hover:border-amber-400/50 hover:bg-amber-500/22'
        )}
      >
        前往庫存查詢
      </button>
    );
  }
  if (stepId === 'rfq') {
    return (
      <button
        type="button"
        onClick={onRfq}
        className={cx(
          'shrink-0 rounded-xl border border-amber-500/35 bg-amber-500/15 px-4 py-2.5 text-sm font-medium text-amber-50',
          'transition-colors hover:border-amber-400/50 hover:bg-amber-500/22'
        )}
      >
        + 新增詢價
      </button>
    );
  }
  if (stepId === 'quote') {
    return (
      <button
        type="button"
        onClick={onQuote}
        className={cx(
          'shrink-0 rounded-xl border border-amber-500/35 bg-amber-500/15 px-4 py-2.5 text-sm font-medium text-amber-50',
          'transition-colors hover:border-amber-400/50 hover:bg-amber-500/22'
        )}
      >
        + 新增報價
      </button>
    );
  }
  if (stepId === 'so') {
    return (
      <button
        type="button"
        onClick={onSo}
        className={cx(
          'shrink-0 rounded-xl border border-amber-500/35 bg-amber-500/15 px-4 py-2.5 text-sm font-medium text-amber-50',
          'transition-colors hover:border-amber-400/50 hover:bg-amber-500/22'
        )}
      >
        + 新增銷貨單
      </button>
    );
  }
  return null;
}

/**
 * @FUNCTION_CODE NX03-WKFL-UI-003-F04
 * 單一步驟面板：標題、條件式 CTA、單據列表或空狀態。
 */
export function WorkflowStepPanel({ stepId, activePath, docs }: WorkflowStepPanelProps) {
  const router = useRouter();
  const stepLabel = useMemo(() => {
    const steps = getStepsForPath(activePath);
    return steps.find((s) => s.id === stepId)?.label ?? stepId;
  }, [activePath, stepId]);
  const pending = countPending(docs);

  const push = (href: string) => {
    router.push(href);
  };

  return (
    <section
      className={cx(
        'rounded-xl border border-border/70 bg-background/40 p-4 sm:p-5',
        'backdrop-blur-sm'
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {stepLabel}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            （{pending} 筆待處理）
          </span>
        </h3>
        <StepCta
          stepId={stepId}
          onStock={() => push('/home')}
          onRfq={() => push('/dashboard/nx01/rfq/new')}
          onQuote={() => push('/dashboard/nx03/quote/new')}
          onSo={() => push('/dashboard/nx03/so/new')}
        />
      </div>

      {docs.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          目前沒有待處理的單據
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/50">
          {docs.map((doc) => (
            <li key={doc.docNo}>
              <button
                type="button"
                onClick={() => {
                  console.log(doc.docNo);
                }}
                className={cx(
                  'flex w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors sm:flex-row sm:items-start sm:justify-between',
                  'cursor-pointer hover:bg-muted/25',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-inset'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium tracking-wide text-muted-foreground">{doc.docNo}</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{doc.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{doc.subtitle}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:ml-4">
                  <span
                    className={cx(
                      'rounded-md border px-2 py-0.5 text-[11px] font-medium',
                      statusBadgeClass(doc.statusVariant)
                    )}
                  >
                    {doc.status}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{doc.date}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
