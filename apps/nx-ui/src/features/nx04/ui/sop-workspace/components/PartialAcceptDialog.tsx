// apps/nx-ui/src/features/sale/ui/sop-workspace/components/PartialAcceptDialog.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 3:STEP 5「部分接受」客戶回應處理。
 *
 * 勾選客戶要的品項,確認後 onConfirm(選中的 sku 清單)。
 * 預設每項都勾選,業務按實際取消不要的。
 * 全部取消 → 應該走「全部不要」選項,所以 canConfirm 要求至少 1 項。
 */

'use client';

import { useMemo, useState } from 'react';

import { cx } from '@design/utils/cx';
import type { QuoteItem } from '../types';
import type { Part } from '../types';

interface PartialAcceptDialogProps {
  items: readonly QuoteItem[];
  partBySku: Record<string, Part>;
  onConfirm: (acceptedSkus: string[]) => void;
  onCancel: () => void;
}

export function PartialAcceptDialog({
  items,
  partBySku,
  onConfirm,
  onCancel,
}: PartialAcceptDialogProps) {
  const [acceptedSkus, setAcceptedSkus] = useState<Set<string>>(
    () => new Set(items.map((i) => i.sku)),
  );

  const toggle = (sku: string) => {
    setAcceptedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const subtotal = useMemo(
    () =>
      items
        .filter((i) => acceptedSkus.has(i.sku))
        .reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    [items, acceptedSkus],
  );

  const acceptedCount = acceptedSkus.size;
  const canConfirm = acceptedCount > 0 && acceptedCount < items.length;

  return (
    <div
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
          <div className="text-base text-white">請勾選客戶要的品項</div>
          <div className="text-xs text-white/60">未勾選的項目會從清單移除</div>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const part = partBySku[item.sku];
            const checked = acceptedSkus.has(item.sku);
            return (
              <button
                key={item.sku}
                type="button"
                onClick={() => toggle(item.sku)}
                className={cx(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  checked
                    ? 'border-[#1D9E75]/60 bg-[#1D9E75]/5'
                    : 'border-white/10 bg-white/5 opacity-60',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      checked
                        ? 'border-[#1D9E75] bg-[#1D9E75]'
                        : 'border-white/30',
                    )}
                    aria-hidden
                  >
                    {checked ? (
                      <span className="text-[10px] text-black">✓</span>
                    ) : null}
                  </span>
                  <span className="font-mono text-xs text-white/40">{item.sku}</span>
                  <span className="truncate text-sm text-white">
                    {part?.name ?? ''}
                  </span>
                </div>
                <div className="ml-6 mt-1 flex items-center justify-between text-xs">
                  <span className="text-white/50 tabular-nums">
                    {item.quantity} × NT$ {item.unitPrice.toLocaleString()}
                  </span>
                  <span className="text-white/70 tabular-nums">
                    NT$ {(item.quantity * item.unitPrice).toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-1 rounded border border-white/10 bg-white/5 p-3 text-xs">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">小計</span>
            <span className="text-white tabular-nums">
              NT$ {subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-white/50">
            <span>
              客戶要 {acceptedCount} 項 / 原 {items.length} 項
            </span>
            {acceptedCount === items.length ? (
              <span className="text-[#E8A020]">請直接選「接受所有品項」</span>
            ) : acceptedCount === 0 ? (
              <span className="text-[#E24B4A]">請至少勾選 1 項</span>
            ) : null}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-lg border border-white/20 text-sm text-white/80 hover:border-white/40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(Array.from(acceptedSkus))}
            disabled={!canConfirm}
            className={cx(
              'h-11 flex-[2] rounded-lg text-sm font-medium transition-colors',
              canConfirm
                ? 'bg-[#E8A020] text-black hover:bg-[#E8A020]/90'
                : 'cursor-not-allowed bg-white/10 text-white/40',
            )}
          >
            確認,繼續下單
          </button>
        </div>
      </div>
    </div>
  );
}
