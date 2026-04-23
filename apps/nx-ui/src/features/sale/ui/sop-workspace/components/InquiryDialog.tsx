// apps/nx-ui/src/features/sale/ui/sop-workspace/components/InquiryDialog.tsx
/**
 * R7 Phase 5：SOP STEP 2「全公司無庫存」時的調貨詢價選擇彈窗。
 *
 * 業務面對缺貨料號有兩個常見路徑：
 *   A. 「加入待辦，稍後處理」 — 繼續服務當前客戶、稍後再統一詢價（會上狀態追蹤待辦清單）
 *   B. 「立刻建詢價單」       — 當下就要處理，跳到調貨詢價作業
 *
 * A+B 並存，由業務自己決定工作節奏，不強迫流程。符合 spec PART 8。
 *
 * Props：
 *   part：顯示 sku + name 讓使用者確認是哪個料號
 *   onSelectA / onSelectB：兩個選項的處理由呼叫端決定（toast / router.push）
 *   onCancel：背景點擊或「取消」按鈕
 */

'use client';

import { BookmarkPlus, Send } from 'lucide-react';

interface InquiryDialogProps {
  part: {
    sku: string;
    name: string;
  };
  onSelectA: () => void;
  onSelectB: () => void;
  onCancel: () => void;
}

export function InquiryDialog({ part, onSelectA, onSelectB, onCancel }: InquiryDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-dialog-title"
    >
      <div
        className="w-full max-w-md space-y-4 rounded-t-2xl border border-white/10 bg-[#1a1a1a] p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <div id="inquiry-dialog-title" className="text-base text-white">
            如何處理調貨詢價？
          </div>
          <div className="text-xs text-white/50">
            <span className="font-mono">{part.sku}</span> {part.name}
          </div>
        </div>

        <button
          type="button"
          onClick={onSelectA}
          className="w-full rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <BookmarkPlus className="h-4 w-4 text-white/70" aria-hidden />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-sm text-white">加入待辦，稍後處理</div>
              <div className="text-xs text-white/60">繼續目前銷售流程</div>
              <div className="mt-1 text-xs text-white/40">
                此料號將出現在「狀態追蹤 → 詢價待回覆」
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onSelectB}
          className="w-full rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Send className="h-4 w-4 text-white/70" aria-hidden />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-sm text-white">立刻建詢價單</div>
              <div className="text-xs text-white/60">跳到調貨詢價作業</div>
              <div className="mt-1 text-xs text-white/40">可選同行廠商、寄出詢價</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="h-10 w-full text-sm text-white/50 transition-colors hover:text-white/70"
        >
          取消
        </button>
      </div>
    </div>
  );
}
