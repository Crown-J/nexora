// apps/nx-ui/src/features/nx04/quote/ui/QuoteRecordPickerDialog.tsx
// 從報價紀錄拉入（NX04 紀錄表 C1c/C2b）：挑某客戶過去報過的紀錄（料號含廠牌+價）→ 勾選帶入單據明細。
//   報價單 / 銷貨單 明細共用。純挑選、不改紀錄。
'use client';

import { Check, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { listQuoteRecords } from '@data/endpoints/nx04/record/api/record';
import type { QuoteRecord } from '@data/types/nx04/record';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

const fmtNum = (n: string | number | null | undefined) =>
  n == null || n === '' ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

export function QuoteRecordPickerDialog({
  customerId,
  customerName,
  onClose,
  onConfirm,
}: {
  customerId: string;
  customerName?: string | null;
  onClose: () => void;
  /** 帶入選定的報價紀錄（父層負責轉成明細） */
  onConfirm: (records: QuoteRecord[]) => void;
}) {
  const [rows, setRows] = useState<QuoteRecord[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hi, setHi] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resp = await listQuoteRecords({ customerId, pageSize: 100 });
        if (alive) setRows(resp.items);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : '載入失敗');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [customerId]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirm = () => {
    const picked = rows.filter((r) => checked.has(r.id));
    if (picked.length) onConfirm(picked);
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-hi="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => Math.min(rows.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === ' ') {
      e.preventDefault();
      const r = rows[hi];
      if (r) toggle(r.id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      confirm();
    }
  };

  const countLabel = useMemo(() => (checked.size ? `已選 ${checked.size} 筆` : '勾選要帶入的項目'), [checked]);

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="從報價紀錄拉入"
      backdropClassName="bg-black/50 backdrop-blur-sm"
      dialogClassName="flex flex-col rounded-xl border border-border bg-card shadow-2xl"
      dialogStyle={{ width: 'min(860px, 96vw)', height: 'min(620px, 92vh)' }}
    >
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <h3 className="text-sm font-semibold">
          從報價紀錄拉入{customerName ? <span className="ml-2 text-xs text-muted-foreground">{customerName}</span> : null}
        </h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-auto px-2 py-2" tabIndex={0} onKeyDown={onKey}>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">載入中…</div>
        ) : err ? (
          <div className="p-6 text-sm text-destructive">{err}</div>
        ) : !rows.length ? (
          <div className="p-6 text-sm text-muted-foreground">此客戶尚無報價紀錄。</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                <th className="w-8 px-2 py-1.5"></th>
                <th className="px-2 py-1.5">報價日期</th>
                <th className="px-2 py-1.5">基準料號</th>
                <th className="px-2 py-1.5">廠牌</th>
                <th className="px-2 py-1.5">品名</th>
                <th className="px-2 py-1.5 text-right">數量</th>
                <th className="px-2 py-1.5 text-right">單價</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const on = checked.has(r.id);
                return (
                  <tr
                    key={r.id}
                    data-hi={i}
                    onClick={() => {
                      setHi(i);
                      toggle(r.id);
                    }}
                    className={`cursor-pointer border-b border-border/30 ${i === hi ? 'bg-primary/10' : ''} ${on ? 'bg-primary/5' : ''} hover:bg-accent/10`}
                  >
                    <td className="px-2 py-1.5">
                      <span className={`grid h-4 w-4 place-items-center rounded border ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                        {on ? <Check className="h-3 w-3" /> : null}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">{r.recordDate.slice(0, 10)}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{r.baseNo ?? r.partNo}</td>
                    <td className="px-2 py-1.5">{r.brandName ?? '—'}</td>
                    <td className="px-2 py-1.5">{r.partName}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(r.qty)}</td>
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums">{fmtNum(r.unitPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/50 px-5 py-3">
        <span className="text-xs text-muted-foreground">{countLabel}　·　空白鍵勾選 · Enter 帶入</span>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
            取消
          </button>
          <button
            type="button"
            disabled={!checked.size}
            onClick={confirm}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            帶入 {checked.size || ''}
          </button>
        </div>
      </div>
    </FocusLockedDialog>
  );
}
