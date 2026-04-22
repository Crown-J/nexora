// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step9Summary.tsx
/**
 * STEP 9 — 完成總結（R6 Phase 3 C3 實作；本檔 C1 為暫時 stub）
 * 已自帶底部兩按鈕，不走 StepWrapper。
 */

'use client';

import { Home, RotateCcw, Trophy } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import type { SaleSopState } from '../types';

export type Step9SummaryProps = {
  state: SaleSopState;
  onReset: () => void;
  onReturnToHub: () => void;
};

export function Step9Summary({ state, onReset, onReturnToHub }: Step9SummaryProps) {
  return (
    <div className="flex min-h-[calc(100dvh-170px)] flex-col">
      <div className="flex-1 px-4 pb-28 pt-4">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[#1D9E75]/40 bg-[#1D9E75]/5 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1D9E75]/20">
            <Trophy className="h-7 w-7 text-[#1D9E75]" aria-hidden />
          </div>
          <div className="text-lg text-white">成交！</div>
          <div className="text-xs text-white/50">
            客戶 {state.selectedCustomer?.name ?? '—'}　訂單{' '}
            <span className="font-mono">{state.orderNumber ?? '—'}</span>
          </div>
          <div className="max-w-xs text-xs leading-relaxed text-white/50">
            業績累計與新業務提醒將於 R6 Phase 3 C3 實作。
          </div>
        </div>
      </div>

      {/* 底部自捷按鈕列 */}
      <nav
        aria-label="成交後操作"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className={cx(
              'inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 text-sm text-white/80',
              'transition-colors hover:border-white/40 active:scale-[0.98]',
            )}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            再來一次
          </button>
          <button
            type="button"
            onClick={onReturnToHub}
            className={cx(
              'inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg',
              'bg-[#E8A020] text-sm font-medium text-black shadow-[0_6px_18px_rgba(232,160,32,0.35)]',
              'transition-colors hover:bg-[#E8A020]/90 active:scale-[0.98]',
            )}
          >
            <Home className="h-4 w-4" aria-hidden />
            回銷貨中心
          </button>
        </div>
      </nav>
    </div>
  );
}
