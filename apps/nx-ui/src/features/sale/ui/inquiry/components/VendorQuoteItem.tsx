// apps/nx-ui/src/features/sale/ui/inquiry/components/VendorQuoteItem.tsx
/**
 * R7 Phase 7-4:RFQ 詳情頁內單一同行報價卡。
 *
 * 顯示:
 *   - 同行編號 / 名稱 / 回報天數
 *   - 金額（tabular-nums）
 *   - 備註（有就顯示左邊直線）
 *   - 兩顆操作按鈕:採用此家（綠）/ 刪除
 */

'use client';

import { CheckCircle2 } from 'lucide-react';

import type { VendorQuote } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

interface VendorQuoteItemProps {
  quote: VendorQuote;
  onAdopt: () => void;
  onRemove: () => void;
}

export function VendorQuoteItem({ quote, onAdopt, onRemove }: VendorQuoteItemProps) {
  const daysAgo = Math.floor((Date.now() - quote.quotedAt.getTime()) / DAY_MS);
  const daysLabel = daysAgo === 0 ? '今日' : `${daysAgo} 天前`;

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-white/40">{quote.vendorCode}</span>
          <span className="text-sm text-white">{quote.vendorName}</span>
        </div>
        <span className="text-xs text-white/50">{daysLabel}</span>
      </div>

      <div className="text-lg text-white tabular-nums">
        NT$ {quote.price.toLocaleString()}
      </div>

      {quote.notes ? (
        <div className="border-l-2 border-white/20 pl-2 text-xs text-white/60">
          {quote.notes}
        </div>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onAdopt}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded bg-[#1D9E75] text-sm text-white transition-colors hover:bg-[#1D9E75]/90"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          <span>採用此家</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="h-9 rounded border border-white/10 px-3 text-sm text-white/60 transition-colors hover:border-[#E24B4A]/60 hover:text-[#E24B4A]"
        >
          刪除
        </button>
      </div>
    </div>
  );
}
