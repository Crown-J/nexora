// apps/nx-ui/src/features/sale/ui/sop-workspace/components/ProgressHeader.tsx
/**
 * 國內銷貨 SOP 頂部流程進度條（sticky top）
 * - 9 節點捷運圖：已完成=綠、當前=金、未到=灰
 * - 顯示當前步驟標題 + 副標題
 * - 左側「返回」按鈕；右側 STEP X / 9 指示
 *
 * 注意：這是從 features/purchase/ui/sop-workspace/ 複製並改用銷貨 meta。
 * 之後若要 DRY，可抽到 features/shared/sop-demo/。
 */

'use client';

import { Fragment } from 'react';

import { cx } from '@/shared/lib/cx';

import { STEPS_META } from '../mock-data/scenario';
import type { StepNumber } from '../types';

export type ProgressHeaderProps = {
  currentStep: StepNumber;
  onBack: () => void;
};

export function ProgressHeader({ currentStep, onBack }: ProgressHeaderProps) {
  const currentMeta = STEPS_META.find((s) => s.id === currentStep) ?? STEPS_META[0];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/95 px-4 py-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center pr-3 text-sm text-white/60 transition-colors hover:text-white/90"
          aria-label="返回"
        >
          <span className="mr-1 text-base leading-none">‹</span>
          返回
        </button>
        <div className="text-[11px] font-medium tracking-wider text-white/50">
          STEP <span className="text-[#E8A020] tabular-nums">{currentStep}</span> / 9
        </div>
      </div>

      {/* 9 節點捷運圖 */}
      <ol
        className="flex items-center"
        aria-label={`銷貨流程，目前第 ${currentStep} 步`}
      >
        {STEPS_META.map((step, idx) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isUpcoming = currentStep < step.id;

          return (
            <Fragment key={step.id}>
              <li className="flex shrink-0 flex-col items-center">
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cx(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                    'transition-all duration-300',
                    isCompleted && 'bg-[#1D9E75] text-white',
                    isCurrent && 'bg-[#E8A020] text-black ring-2 ring-[#E8A020]/40',
                    isUpcoming && 'bg-white/10 text-white/40',
                  )}
                >
                  {isCompleted ? '✓' : step.id}
                </span>
              </li>
              {idx < STEPS_META.length - 1 ? (
                <span
                  aria-hidden
                  className={cx(
                    'h-0.5 flex-1 transition-colors duration-300',
                    currentStep > step.id ? 'bg-[#1D9E75]' : 'bg-white/10',
                  )}
                />
              ) : null}
            </Fragment>
          );
        })}
      </ol>

      <div className="mt-3 text-center">
        <div className="text-sm font-semibold text-[#E8A020]">{currentMeta.title}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-white/50">{currentMeta.subtitle}</div>
      </div>
    </header>
  );
}
