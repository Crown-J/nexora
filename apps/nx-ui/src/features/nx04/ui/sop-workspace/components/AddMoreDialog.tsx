// apps/nx-ui/src/features/sale/ui/sop-workspace/components/AddMoreDialog.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 3 追加品項機制:
 * STEP 2 加入清單後彈出,讓業務決定「還要查下一個」或「沒了,報價給客戶」。
 *
 * 對應 Crown 對真實業務的觀察(碎片化詢問):
 *   客戶不會一次講完,每報完一項可能臨時想到下一項。
 *   系統不該強迫業務在點「加入清單」後立刻進下一步。
 */

'use client';

import { useRef } from 'react';

import { Plus } from 'lucide-react';

import { useModalLayer } from '@design/primitives/modal-stack';

interface AddMoreDialogProps {
  /** 剛加入的料號名稱,讓使用者確認加了什麼 */
  justAddedPartName: string;
  onAddMore: () => void;
  onFinish: () => void;
}

export function AddMoreDialog({
  justAddedPartName,
  onAddMore,
  onFinish,
}: AddMoreDialogProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onFinish);
  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      onClick={onFinish}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md space-y-4 rounded-t-2xl border border-white/10 bg-[#1a1a1a] p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <div className="text-base text-white">已加入清單</div>
          <div className="text-xs text-white/60">
            {justAddedPartName} 已加入報價清單
          </div>
          <div className="pt-2 text-xs text-white/50">客戶還要查其他品項嗎?</div>
        </div>

        <button
          type="button"
          onClick={onAddMore}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#E8A020]/60 text-sm text-[#E8A020] transition-colors hover:bg-[#E8A020]/10"
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span>還要查其他料號</span>
        </button>

        <button
          type="button"
          onClick={onFinish}
          className="h-11 w-full rounded-lg bg-[#E8A020] text-sm font-medium text-black hover:bg-[#E8A020]/90"
        >
          沒了,向客戶報價
        </button>
      </div>
    </div>
  );
}
