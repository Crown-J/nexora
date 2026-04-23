// apps/nx-ui/src/features/sale/ui/sop-workspace/components/PriceAdjustDialog.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 3:STEP 5「要求調整價格」客戶回應處理。
 *
 * 業務逐項輸入新單價,系統即時顯示毛利率變化(原→新)。
 * 確認後呼叫 onConfirm(Map<sku, 新單價>)。
 * 新單價 0 視為無效。
 */

'use client';

import { useMemo, useState } from 'react';

import { cx } from '@/shared/lib/cx';
import { TIER_TARGET_MARGIN } from '@/features/sale/ui/inquiry/types';
import type { CustomerTier, Part, QuoteItem } from '../types';

interface PriceAdjustDialogProps {
  items: readonly QuoteItem[];
  partBySku: Record<string, Part>;
  tier: CustomerTier;
  onConfirm: (updates: Record<string, number>) => void;
  onCancel: () => void;
}

function calcMargin(price: number, cost: number): number {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

export function PriceAdjustDialog({
  items,
  partBySku,
  tier,
  onConfirm,
  onCancel,
}: PriceAdjustDialogProps) {
  const [edits, setEdits] = useState<Record<string, string>>(
    () =>
      items.reduce<Record<string, string>>((acc, i) => {
        acc[i.sku] = String(i.unitPrice);
        return acc;
      }, {}),
  );

  const setPriceStr = (sku: string, str: string) =>
    setEdits((prev) => ({ ...prev, [sku]: str }));

  const targetMargin = TIER_TARGET_MARGIN[tier];

  const { newTotal, overallMargin, allValid } = useMemo(() => {
    let total = 0;
    let totalCost = 0;
    let valid = true;
    items.forEach((i) => {
      const n = Number(edits[i.sku]);
      if (!Number.isFinite(n) || n <= 0) {
        valid = false;
        return;
      }
      const part = partBySku[i.sku];
      total += n * i.quantity;
      totalCost += (part?.unitCost ?? 0) * i.quantity;
    });
    const om = total > 0 ? ((total - totalCost) / total) * 100 : 0;
    return { newTotal: total, overallMargin: om, allValid: valid };
  }, [edits, items, partBySku]);

  const handleSubmit = () => {
    const updates: Record<string, number> = {};
    items.forEach((i) => {
      const n = Number(edits[i.sku]);
      if (Number.isFinite(n) && n > 0) updates[i.sku] = Math.round(n);
    });
    onConfirm(updates);
  };

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
          <div className="text-base text-white">客戶要求調整價格</div>
          <div className="text-xs text-white/60">請逐項調整單價,系統會即時提示毛利變化</div>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const part = partBySku[item.sku];
            const cost = part?.unitCost ?? 0;
            const oldMargin = calcMargin(item.unitPrice, cost);
            const newPrice = Number(edits[item.sku]);
            const newMargin = Number.isFinite(newPrice) ? calcMargin(newPrice, cost) : 0;
            const dropped = newMargin < oldMargin - 0.5;
            return (
              <div
                key={item.sku}
                className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white/40">{item.sku}</span>
                  <span className="truncate text-sm text-white">{part?.name ?? ''}</span>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <span className="text-white/50">原單價</span>
                  <span className="text-white/70 tabular-nums">
                    NT$ {item.unitPrice.toLocaleString()}(毛利 {oldMargin.toFixed(0)}%)
                  </span>
                  <span className="text-white/50">新單價</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={edits[item.sku] ?? ''}
                      onChange={(e) => setPriceStr(item.sku, e.target.value)}
                      className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white tabular-nums focus:border-[#E8A020]/60 focus:outline-none"
                    />
                    <span
                      className={cx(
                        'tabular-nums',
                        dropped ? 'text-[#E8A020]' : 'text-white/70',
                      )}
                    >
                      {newPrice > 0
                        ? `毛利 ${newMargin.toFixed(0)}%${dropped ? ' ⚠' : ''}`
                        : '—'}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1 rounded border border-white/10 bg-white/5 p-3 text-xs">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">新總金額</span>
            <span className="text-white tabular-nums">
              NT$ {newTotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">整體毛利</span>
            <span
              className={cx(
                'tabular-nums',
                overallMargin >= targetMargin ? 'text-[#1D9E75]' : 'text-[#E8A020]',
              )}
            >
              {overallMargin.toFixed(1)}% ({tier} 級目標 {targetMargin}%)
              {overallMargin < targetMargin ? ' ⚠' : ' ✓'}
            </span>
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
            onClick={handleSubmit}
            disabled={!allValid}
            className={cx(
              'h-11 flex-[2] rounded-lg text-sm font-medium transition-colors',
              allValid
                ? 'bg-[#E8A020] text-black hover:bg-[#E8A020]/90'
                : 'cursor-not-allowed bg-white/10 text-white/40',
            )}
          >
            重新報價
          </button>
        </div>
      </div>
    </div>
  );
}
