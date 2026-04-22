// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step8OrderComplete.tsx
/**
 * STEP 8 — 訂單成立（R6 Phase 3 C2 實作；本檔 C1 為暫時 stub）
 */

'use client';

import { CheckCircle2 } from 'lucide-react';

import type { SaleSopState } from '../types';
import { StepWrapper } from './StepWrapper';

export type Step8OrderCompleteProps = {
  state: SaleSopState;
  onBack: () => void;
  onNext: () => void;
};

export function Step8OrderComplete({ state, onBack, onNext }: Step8OrderCompleteProps) {
  return (
    <StepWrapper canProceed onBack={onBack} onNext={onNext} nextLabel="下一步 → 成交總結">
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1D9E75]/20">
          <CheckCircle2 className="h-8 w-8 text-[#1D9E75]" aria-hidden />
        </div>
        <div className="text-lg text-white">訂單已建立</div>
        <div className="font-mono text-xs text-white/40">{state.orderNumber ?? '—'}</div>
        <div className="max-w-xs text-xs leading-relaxed text-white/50">
          系統自動化清單將於 R6 Phase 3 C2 實作。
        </div>
      </div>
    </StepWrapper>
  );
}
