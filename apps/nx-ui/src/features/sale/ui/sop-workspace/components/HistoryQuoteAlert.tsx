// apps/nx-ui/src/features/sale/ui/sop-workspace/components/HistoryQuoteAlert.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 2:S03/S04 展開料號詳情時的歷史記錄提醒卡。
 *
 * 三種形態:
 *   quote:N 天前曾報過 NT$ X(毛利 N%)  — 可「套用此價格」或「查看詳情」
 *   rfq:  正在向同行詢價中(RFQ-xxx,等待 N 天) — 可「查看詢價」
 *   qt:   已報過 NT$ X,待客戶確認(QT-xxx,N 天前)  — 可「查看報價」
 *
 * 染色由 type 決定(藍=qt 提示、金=rfq 進行中、灰=quote 歷史)。
 */

'use client';

import type { LucideIcon } from 'lucide-react';
import { FileText, History, Search } from 'lucide-react';

import { cx } from '@/shared/lib/cx';
import type { HistoryRecord } from '../mock-data/quote-history';

interface HistoryQuoteAlertProps {
  history: HistoryRecord;
  /** 點「套用此價格」(只有 type=quote 才顯示) */
  onApply?: (amount: number) => void;
  /** 點「查看詳情」跳單據詳情頁 */
  onView?: (history: HistoryRecord) => void;
}

const TYPE_META: Record<
  HistoryRecord['type'],
  { Icon: LucideIcon; color: string; viewLabel: string }
> = {
  quote: { Icon: History, color: 'text-white/60', viewLabel: '查看歷史' },
  rfq: { Icon: Search, color: 'text-[#E8A020]', viewLabel: '查看詢價' },
  qt: { Icon: FileText, color: 'text-[#4D8FE8]', viewLabel: '查看報價' },
};

export function HistoryQuoteAlert({ history, onApply, onView }: HistoryQuoteAlertProps) {
  const { Icon, color, viewLabel } = TYPE_META[history.type];

  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
      <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', color)} aria-hidden />
      <div className="flex-1 space-y-1 text-xs">
        <div className="text-white/80">
          {history.type === 'quote' && history.amount !== undefined ? (
            <>
              {history.daysAgo} 天前曾報過{' '}
              <span className="tabular-nums text-white">
                NT$ {history.amount.toLocaleString()}
              </span>
            </>
          ) : null}
          {history.type === 'rfq' ? (
            <>
              正在向同行詢價中(<span className="font-mono">{history.docNumber}</span>
              ,等待 {history.daysAgo} 天)
            </>
          ) : null}
          {history.type === 'qt' && history.amount !== undefined ? (
            <>
              已報過{' '}
              <span className="tabular-nums text-white">
                NT$ {history.amount.toLocaleString()}
              </span>{' '}
              待客戶確認(<span className="font-mono">{history.docNumber}</span>,
              {history.daysAgo} 天前)
            </>
          ) : null}
        </div>

        {history.margin !== undefined ? (
          <div className="text-white/50">毛利 {history.margin}%</div>
        ) : null}

        <div className="flex gap-3 pt-1">
          {history.type === 'quote' && history.amount !== undefined && onApply ? (
            <button
              type="button"
              onClick={() => onApply(history.amount!)}
              className="text-[#E8A020] hover:underline"
            >
              套用此價格
            </button>
          ) : null}
          {onView ? (
            <button
              type="button"
              onClick={() => onView(history)}
              className="text-white/60 hover:underline"
            >
              {viewLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
