// apps/nx-ui/src/features/sale/ui/inquiry/components/InquiryListItem.tsx
/**
 * R7 Phase 7-3：RFQ 列表的單一卡片。
 *
 * 顯示：
 *   - RFQ 號 + 建立天數（染色依等待時間）
 *   - 來源客戶（代碼 / 名稱 / 等級 badge）
 *   - 料號（sku / name）
 *   - 數量 + 狀態文字（等待中 / N 家已回覆 / 已採用 / 已放棄）
 *   - 右下「處理 →」提示可點進詳情頁
 */

'use client';

import { ChevronRight } from 'lucide-react';

import { cx } from '@design/utils/cx';
import type { RFQ } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

interface InquiryListItemProps {
  rfq: RFQ;
  onClick: () => void;
}

export function InquiryListItem({ rfq, onClick }: InquiryListItemProps) {
  const daysSinceCreated = Math.floor((Date.now() - rfq.createdAt.getTime()) / DAY_MS);

  const waitBadgeClass =
    daysSinceCreated < 3
      ? 'bg-white/10 text-white/70'
      : daysSinceCreated <= 7
        ? 'bg-[#E8A020]/15 text-[#E8A020]'
        : 'bg-[#E24B4A]/15 text-[#E24B4A]';

  const waitBadgeText = daysSinceCreated >= 7 ? '逾期！' : `${daysSinceCreated} 天前`;

  const statusLabel =
    rfq.status === 'waiting'
      ? '尚未有同行回覆'
      : rfq.status === 'responded'
        ? `已 ${rfq.vendorQuotes.length} 家回覆`
        : rfq.status === 'adopted'
          ? '已採用'
          : '已放棄';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs text-white/70">{rfq.rfqNumber}</span>
        <span className={cx('rounded px-2 py-0.5 text-xs', waitBadgeClass)}>
          {waitBadgeText}
        </span>
      </div>

      <div className="mb-1 flex items-center gap-2">
        <span className="shrink-0 font-mono text-xs text-white/40">
          {rfq.sourceCustomer.code}
        </span>
        <span className="truncate text-sm text-white">{rfq.sourceCustomer.name}</span>
        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
          {rfq.sourceCustomer.tier} 級
        </span>
      </div>

      <div className="mb-2 text-xs text-white/60">
        <span className="font-mono">{rfq.part.sku}</span> {rfq.part.name}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="text-white/50 tabular-nums">
          數量:{rfq.quantity} · {statusLabel}
        </div>
        <div className="flex items-center gap-1 text-[#E8A020]">
          <span>處理</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </div>
      </div>
    </button>
  );
}
