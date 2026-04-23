// apps/nx-ui/src/features/sale/ui/inquiry/components/AdoptQuoteDialog.tsx
/**
 * R7 Phase 7-4 核心互動:採用同行報價後的確認彈窗。
 *
 * 業務決策的核心畫面:
 *   1. 顯示「同行成本 + 客戶等級毛利目標」
 *   2. 預填「建議售價 = cost × (1 + margin)」
 *   3. 售價輸入可調整（業務可偏離建議,想多賺改高、客戶難搞改低）
 *   4. 即時毛利試算:達標綠、略低金
 *   5. 確認 → 呼叫端 adoptVendorQuote → store 生成 QT
 *
 * Spec PART 4.5 的視覺規格（標題「採用 xxx」、成本資訊卡、售價編輯大框、試算小卡）。
 */

'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import { cx } from '@/shared/lib/cx';
import type { RFQ } from '../types';
import { TIER_TARGET_MARGIN } from '../types';

interface AdoptQuoteDialogProps {
  rfq: RFQ;
  vendorQuoteId: string;
  onConfirm: (finalPrice: number) => void;
  onCancel: () => void;
}

export function AdoptQuoteDialog({
  rfq,
  vendorQuoteId,
  onConfirm,
  onCancel,
}: AdoptQuoteDialogProps) {
  const vendor = useMemo(
    () => rfq.vendorQuotes.find((v) => v.id === vendorQuoteId),
    [rfq.vendorQuotes, vendorQuoteId],
  );
  const tierMargin = TIER_TARGET_MARGIN[rfq.sourceCustomer.tier];

  const suggestedPrice = useMemo(
    () => (vendor ? Math.round(vendor.price * (1 + tierMargin / 100)) : 0),
    [vendor, tierMargin],
  );

  const [finalPriceStr, setFinalPriceStr] = useState(String(suggestedPrice));
  const finalPrice = Number(finalPriceStr);
  const finalPriceValid = Number.isFinite(finalPrice) && finalPrice > 0;

  if (!vendor) return null;

  const margin = finalPrice - vendor.price;
  const marginRate = finalPrice > 0 ? (margin / finalPrice) * 100 : 0;
  const achievedTarget = marginRate >= tierMargin;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="adopt-dialog-title"
    >
      <div
        className="w-full max-w-md space-y-4 rounded-t-2xl border border-white/10 bg-[#1a1a1a] p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" aria-hidden />
            <div id="adopt-dialog-title" className="text-base text-white">
              採用 {vendor.vendorName}
            </div>
          </div>
          <div className="text-xs text-white/60">
            系統將自動建立報價單給 {rfq.sourceCustomer.name}
          </div>
        </div>

        {/* 成本資訊 */}
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">同行成本</span>
            <span className="text-white tabular-nums">
              NT$ {vendor.price.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">
              {rfq.sourceCustomer.tier} 級目標毛利率
            </span>
            <span className="text-white tabular-nums">{tierMargin}%</span>
          </div>
        </div>

        {/* 售價編輯 */}
        <div>
          <label className="mb-2 block text-xs text-white/50">
            給客戶的報價（可調整）
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
              NT$
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={finalPriceStr}
              onChange={(e) => setFinalPriceStr(e.target.value)}
              className="w-full rounded border border-[#E8A020]/60 bg-white/5 py-3 pl-10 pr-3 text-base text-white tabular-nums focus:outline-none"
            />
          </div>
          <div className="mt-1 text-xs text-white/40">
            系統建議:NT$ {suggestedPrice.toLocaleString()}（{tierMargin}% 毛利）
          </div>
        </div>

        {/* 即時毛利試算 */}
        <div className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-white/50">預估毛利</span>
            <span className="text-white/80 tabular-nums">
              NT$ {margin.toLocaleString()} ({marginRate.toFixed(1)}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{rfq.sourceCustomer.tier} 級目標</span>
            <span className={achievedTarget ? 'text-[#1D9E75]' : 'text-[#E8A020]'}>
              {tierMargin}%
              {achievedTarget ? ' ✓ 達標' : ' ⚠ 略低'}
            </span>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-lg border border-white/20 text-sm text-white/80 transition-colors hover:border-white/40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(Math.round(finalPrice))}
            disabled={!finalPriceValid}
            className={cx(
              'h-11 flex-[2] rounded-lg text-sm font-medium transition-colors',
              finalPriceValid
                ? 'bg-[#1D9E75] text-white hover:bg-[#1D9E75]/90'
                : 'cursor-not-allowed bg-white/10 text-white/40',
            )}
          >
            確認建立報價單
          </button>
        </div>
      </div>
    </div>
  );
}
