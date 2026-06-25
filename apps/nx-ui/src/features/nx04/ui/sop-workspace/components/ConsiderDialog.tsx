// apps/nx-ui/src/features/sale/ui/sop-workspace/components/ConsiderDialog.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 3:STEP 5「考慮看看」客戶回應處理。
 *
 * 業務確認:
 *   - 客戶資訊 + 清單摘要(保固訪單用)
 *   - 追蹤天數(預設 7,可調)
 *   - 送出 → 呼叫端建立 QT(pending_customer) + 跳出 SOP
 *
 * 依 Crown 新規則,此 QT 不進待辦追蹤清單,但業務下次查相同料號會自動提醒。
 */

'use client';

import { useMemo, useRef, useState } from 'react';

import { cx } from '@design/utils/cx';
import { useModalLayer } from '@design/primitives/modal-stack';
import type { Part, QuoteItem } from '../types';

interface ConsiderDialogProps {
  customerCode: string;
  customerName: string;
  items: readonly QuoteItem[];
  partBySku: Record<string, Part>;
  onConfirm: (trackingDays: number) => void;
  onCancel: () => void;
}

export function ConsiderDialog({
  customerCode,
  customerName,
  items,
  partBySku,
  onConfirm,
  onCancel,
}: ConsiderDialogProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onCancel);
  const [daysStr, setDaysStr] = useState('7');
  const days = Number(daysStr);
  const daysValid = Number.isFinite(days) && days > 0 && days <= 90;

  const total = useMemo(
    () => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    [items],
  );

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
          <div className="text-base text-white">客戶考慮中</div>
          <div className="text-xs text-white/60">
            系統將記錄此次報價,下次查相同料號時自動提醒。
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-white/40">{customerCode}</span>
            <span className="text-sm text-white">{customerName}</span>
          </div>
          <div className="text-white/60">
            共 {items.length} 項報價,總額{' '}
            <span className="text-white tabular-nums">
              NT$ {total.toLocaleString()}
            </span>
          </div>
          <div className="space-y-0.5 border-t border-white/10 pt-2">
            {items.map((i) => {
              const part = partBySku[i.sku];
              return (
                <div key={i.sku} className="flex items-center justify-between">
                  <div className="min-w-0 truncate text-white/70">
                    <span className="mr-1.5 font-mono text-white/40">{i.sku}</span>
                    {part?.name ?? ''}
                  </div>
                  <span className="shrink-0 text-white/70 tabular-nums">
                    NT$ {i.unitPrice.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-white/50">預計追蹤天數</span>
              <span className="text-white/40">超過會在狀態追蹤提醒</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={daysStr}
                onChange={(e) => setDaysStr(e.target.value)}
                className="w-24 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white tabular-nums focus:border-[#E8A020]/60 focus:outline-none"
              />
              <span className="text-xs text-white/60">天</span>
            </div>
          </label>
          <div className="text-xs text-white/40">報價有效期預設 30 天</div>
        </div>

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
            onClick={() => onConfirm(Math.round(days))}
            disabled={!daysValid}
            className={cx(
              'h-11 flex-[2] rounded-lg text-sm font-medium transition-colors',
              daysValid
                ? 'bg-[#E8A020] text-black hover:bg-[#E8A020]/90'
                : 'cursor-not-allowed bg-white/10 text-white/40',
            )}
          >
            完成記錄
          </button>
        </div>
      </div>
    </div>
  );
}
