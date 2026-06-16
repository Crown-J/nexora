// apps/nx-ui/src/features/sale/ui/sop-workspace/components/StepPlaceholder.tsx
/**
 * 尚未實作的 Step 用占位畫面（R6 分階段交付期間）。
 * Phase 1 只做 STEP 1~2，其餘用占位，Crown 能先預覽 9 節點流程條動畫。
 */

'use client';

import { Hammer, RotateCw } from 'lucide-react';

import { STEPS_META } from '../mock-data/scenario';
import type { StepNumber } from '../types';
import { StepWrapper } from './StepWrapper';

export type StepPlaceholderProps = {
  currentStep: StepNumber;
  onBack: () => void;
  onNext: () => void;
};

export function StepPlaceholder({ currentStep, onBack, onNext }: StepPlaceholderProps) {
  const isLast = currentStep === 9;
  const meta = STEPS_META.find((s) => s.id === currentStep);
  return (
    <StepWrapper
      canProceed
      onBack={onBack}
      onNext={onNext}
      nextLabel={isLast ? '🔁 再來一次' : '下一步 →（預覽流程）'}
      tone={isLast ? 'positive' : 'primary'}
    >
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/5">
          {isLast ? (
            <RotateCw className="h-9 w-9 text-[#1D9E75]" aria-hidden />
          ) : (
            <Hammer className="h-9 w-9 text-[#E8A020]" aria-hidden />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white/90">
            STEP {currentStep} {isLast ? '成交完成' : '建置中'}
          </h2>
          <p className="mt-1 text-sm text-white/60">{meta?.title}</p>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-white/50">
          {isLast
            ? '此步驟將呈現成交總結與業務業績累計；R6 Phase 3 完成後會有完整畫面。'
            : '此步驟將在 R6 下一階段實作。您可以點「下一步」預覽流程節點動畫，或「上一步」回到已完成的步驟。'}
        </p>
      </div>
    </StepWrapper>
  );
}
