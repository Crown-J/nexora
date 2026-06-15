// apps/nx-ui/src/features/sale/ui/sop-workspace/components/StepWrapper.tsx
/**
 * 每個 Step 統一的版面殼（複製自 purchase，邏輯相同）
 * - 內容區（可滾動、上方留給 ProgressHeader、下方留給固定按鈕列）
 * - 底部 fixed 按鈕列：上一步 + 主 CTA
 */

'use client';

import type { ReactNode } from 'react';

import { cx } from '@design/utils/cx';

export type StepWrapperProps = {
  children: ReactNode;
  canProceed: boolean;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  tone?: 'primary' | 'positive' | 'neutral';
  disabledHint?: string;
};

export function StepWrapper({
  children,
  canProceed,
  onBack,
  onNext,
  nextLabel = '下一步 →',
  tone = 'primary',
  disabledHint,
}: StepWrapperProps) {
  const primaryToneCls =
    tone === 'positive'
      ? 'bg-[#1D9E75] text-white shadow-[0_6px_18px_rgba(29,158,117,0.35)]'
      : tone === 'neutral'
        ? 'bg-white/90 text-black'
        : 'bg-[#E8A020] text-black shadow-[0_6px_18px_rgba(232,160,32,0.35)]';

  return (
    <div className="flex min-h-[calc(100dvh-170px)] flex-col">
      <div className="flex-1 px-4 pb-28 pt-4">{children}</div>

      <nav
        aria-label="步驟操作"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-12 min-w-[96px] flex-1 items-center justify-center rounded-lg border border-white/20 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 active:scale-[0.98]"
            >
              上一步
            </button>
          ) : null}
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            aria-disabled={!canProceed}
            title={!canProceed ? disabledHint : undefined}
            className={cx(
              'inline-flex h-12 flex-[2] items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]',
              canProceed
                ? primaryToneCls
                : 'cursor-not-allowed bg-white/10 text-white/40',
            )}
          >
            {canProceed ? nextLabel : (disabledHint ?? nextLabel)}
          </button>
        </div>
      </nav>
    </div>
  );
}
