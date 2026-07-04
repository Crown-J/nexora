// apps/nx-ui/src/features/nx04/quote/ui/PriceIntelPanel.tsx
// 報價比價面板（5 格，執行長 2026-07-02）：選中一顆料時顯示
//   ① 建議售價(等級地板，一律顯示) ② 同客戶報價 ③ 同客戶成交 ④ 同級距他客報價 ⑤ 同級距他客成交
//   ②~⑤ 逾一個月後端回 null → 顯示「—」
'use client';

import { useEffect, useState } from 'react';

import { getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import type { QuotePriceIntel, QuotePriceRef } from '@data/types/nx04/quote';

const fmt = (n: string) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

function Cell({ label, pr }: { label: string; pr: QuotePriceRef | null }) {
  return (
    <div className="min-w-0 flex-1 rounded border border-border/50 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-sm tabular-nums">{pr ? fmt(pr.amount) : '—'}</div>
      <div className="text-[10px] text-muted-foreground/60">{pr ? pr.date.slice(0, 10) : '　'}</div>
    </div>
  );
}

export function PriceIntelPanel({ customerId, partId }: { customerId: string; partId: string | null }) {
  const [intel, setIntel] = useState<QuotePriceIntel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!partId) {
      setIntel(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getQuotePriceIntel(customerId, partId)
      .then((r) => {
        if (!cancelled) setIntel(r);
      })
      .catch(() => {
        if (!cancelled) setIntel(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, partId]);

  if (!partId) return null;
  return (
    <div className="flex items-stretch gap-2 text-xs">
      {/* ① 建議售價：一律顯示、當基準 */}
      <div className="min-w-0 flex-1 rounded border border-primary/50 bg-primary/10 px-2 py-1.5">
        <div className="text-[10px] text-muted-foreground">建議售價</div>
        <div className="truncate font-mono text-[15px] font-semibold tabular-nums text-primary">
          {intel?.suggestedPrice ? fmt(intel.suggestedPrice) : loading ? '…' : '—'}
        </div>
        <div className="text-[10px] text-muted-foreground/60">等級地板</div>
      </div>
      <Cell label="同客戶·報價" pr={intel?.sameCustomerQuote ?? null} />
      <Cell label="同客戶·成交" pr={intel?.sameCustomerSale ?? null} />
      <Cell label="同級距·報價" pr={intel?.sameGradeQuote ?? null} />
      <Cell label="同級距·成交" pr={intel?.sameGradeSale ?? null} />
    </div>
  );
}
