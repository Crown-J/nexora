// apps/nx-ui/src/features/sale/ui/sop-workspace/components/RejectReasonDialog.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 3:STEP 5「全部不要」客戶回應處理。
 *
 * 業務選拒絕原因(多選)+ 備註,送出後記錄「流失」分析(未來 R10)。
 * 至少要選 1 項原因才能送出。
 */

'use client';

import { useRef, useState } from 'react';

import { cx } from '@design/utils/cx';
import { useModalLayer } from '@design/primitives/modal-stack';
import type { RejectReasonCode } from '../types';

interface RejectReasonDialogProps {
  onConfirm: (reasons: RejectReasonCode[], note: string) => void;
  onCancel: () => void;
}

const REASONS: ReadonlyArray<{ code: RejectReasonCode; label: string }> = [
  { code: 'price_high', label: '價格太貴' },
  { code: 'no_matching_sku', label: '沒有需要的料號' },
  { code: 'bought_elsewhere', label: '已向其他廠商購買' },
  { code: 'funding_issue', label: '客戶資金問題' },
  { code: 'future_need', label: '等下次需要再聯絡' },
  { code: 'other', label: '其他' },
];

export function RejectReasonDialog({ onConfirm, onCancel }: RejectReasonDialogProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onCancel);
  const [selected, setSelected] = useState<Set<RejectReasonCode>>(new Set());
  const [note, setNote] = useState('');

  const toggle = (code: RejectReasonCode) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const canSubmit = selected.size > 0;

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[85dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a1a1a] p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <div className="text-base text-white">客戶不下單</div>
          <div className="text-xs text-white/60">
            請選擇拒絕原因(可多選),協助未來流失分析
          </div>
        </div>

        <div className="space-y-2">
          {REASONS.map((r) => {
            const isSel = selected.has(r.code);
            return (
              <button
                key={r.code}
                type="button"
                onClick={() => toggle(r.code)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                  isSel
                    ? 'border-[#E8A020]/60 bg-[#E8A020]/5 text-white'
                    : 'border-white/10 bg-white/5 text-white/80 hover:border-white/20',
                )}
              >
                <span
                  className={cx(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    isSel ? 'border-[#E8A020] bg-[#E8A020]' : 'border-white/30',
                  )}
                  aria-hidden
                >
                  {isSel ? <span className="text-[10px] text-black">✓</span> : null}
                </span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-white/50">備註</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="可補充細節,例如客戶說下週再聯絡"
            className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#E8A020]/60 focus:outline-none"
          />
        </label>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-lg border border-white/20 text-sm text-white/80 hover:border-white/40"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={() => onConfirm(Array.from(selected), note.trim())}
            disabled={!canSubmit}
            className={cx(
              'h-11 flex-[2] rounded-lg text-sm font-medium transition-colors',
              canSubmit
                ? 'bg-[#E8A020] text-black hover:bg-[#E8A020]/90'
                : 'cursor-not-allowed bg-white/10 text-white/40',
            )}
          >
            送出記錄
          </button>
        </div>
      </div>
    </div>
  );
}
