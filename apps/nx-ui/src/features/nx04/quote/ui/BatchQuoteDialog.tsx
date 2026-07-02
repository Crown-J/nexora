// apps/nx-ui/src/features/nx04/quote/ui/BatchQuoteDialog.tsx
// 批次報價 picker（執行長 2026-07-01）：存檔表頭後 / A 新增項目 → 搜料號 → 帶出整組替代料候選
//   13 欄核取清單：核取 / 基準料號 / 廠牌料號 / 廠牌 / 品名 / 出貨倉庫 / 該倉剩餘數量 / 報價數量
//     / 上次該客戶(日期·金額) / 上次該零件(日期·金額) / 此次報價(預帶建議售價)
//   ↑↓ 選列、空白鍵勾選、Enter → 確認報價視窗 → 一次多行落單
'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { addQuoteItem, getQuoteCandidates } from '@data/endpoints/nx04/quote/api/quote';
import type { QuoteCandidate } from '@data/types/nx04/quote';

import { PartPicker } from './PartPicker';

const fmt = (n: string | number) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtDate = (s: string | null) => (s ? s.slice(0, 10) : '—');

export function BatchQuoteDialog({
  quoteId,
  customerId,
  warehouseId,
  warehouseName,
  onClose,
  onAdded,
}: {
  quoteId: string;
  customerId: string;
  warehouseId: string;
  warehouseName: string;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<QuoteCandidate[]>([]);
  const [whName, setWhName] = useState(warehouseName);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState<Record<string, string>>({});
  const [price, setPrice] = useState<Record<string, string>>({});
  const [hi, setHi] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const loadCandidates = useCallback(
    async (partId: string) => {
      setLoading(true);
      setErr(null);
      try {
        const res = await getQuoteCandidates(customerId, partId, warehouseId);
        setRows(res.candidates);
        setWhName(res.warehouseName);
        const p: Record<string, string> = {};
        const q: Record<string, string> = {};
        res.candidates.forEach((c) => {
          p[c.id] = c.suggestedPrice ?? '';
          q[c.id] = '1';
        });
        setPrice(p);
        setQty(q);
        setChecked(new Set());
        setHi(0);
        queueMicrotask(() => gridRef.current?.focus());
      } catch (e) {
        setErr(e instanceof Error ? e.message : '查候選失敗');
      } finally {
        setLoading(false);
      }
    },
    [customerId, warehouseId],
  );

  const toggle = useCallback((id: string) => {
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  // 選中列捲入可視
  useEffect(() => {
    gridRef.current?.querySelector(`[data-cand-row="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  const onGridKey = (e: React.KeyboardEvent) => {
    const inInput = (e.target as HTMLElement).tagName === 'INPUT';
    if (e.key === 'ArrowDown' && !inInput) {
      e.preventDefault();
      setHi((h) => Math.min(rows.length - 1, h + 1));
    } else if (e.key === 'ArrowUp' && !inInput) {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if ((e.key === ' ' || e.code === 'Space') && !inInput) {
      e.preventDefault();
      const c = rows[hi];
      if (c) toggle(c.id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (checked.size) setConfirmOpen(true);
    }
  };

  async function doConfirm() {
    const picked = rows.filter((c) => checked.has(c.id));
    if (!picked.length) return;
    setBusy(true);
    setErr(null);
    let done = 0;
    try {
      for (const c of picked) {
        await addQuoteItem(quoteId, {
          partId: c.id,
          qty: Number(qty[c.id] || '1'),
          unitPriceSnapshot: Number(price[c.id] || '0'),
        });
        done++;
      }
      await onAdded();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加入失敗';
      setErr(`已加入 ${done}/${picked.length} 筆，第 ${done + 1} 筆失敗：${msg}`);
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const th = 'whitespace-nowrap border border-border/60 bg-muted px-2 py-1.5 text-left text-[11px] font-medium uppercase text-muted-foreground';
  const td = 'whitespace-nowrap border border-border/60 px-2 py-1 text-xs';
  const cellInput = 'w-20 rounded border bg-background px-1 py-0.5 text-right text-xs tabular-nums';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[88vh] w-[96vw] max-w-[1400px] flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
          <h3 className="text-sm font-semibold">即時查詢料號 · 批次報價</h3>
          <span className="text-xs text-muted-foreground">出貨倉庫：{whName}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">↑↓ 選列 · 空白鍵勾選 · Enter 確認</span>
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 搜尋列 */}
        <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2">
          <span className="text-xs text-muted-foreground">搜尋料號</span>
          <div className="w-96">
            <PartPicker autoFocus onPick={(p) => void loadCandidates(p.id)} />
          </div>
          {loading ? <span className="text-xs text-primary">查詢中…</span> : null}
          <span className="ml-auto text-xs text-muted-foreground">
            已勾 <span className="font-semibold text-primary">{checked.size}</span> 項
          </span>
        </div>

        {err ? <div className="mx-4 mt-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs">{err}</div> : null}

        {/* 候選清單 */}
        <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} className="min-h-0 flex-1 overflow-auto p-3 outline-none">
          {rows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {loading ? '查詢中…' : '搜尋料號帶出整組可替換零件'}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={th}></th>
                  <th className={th}>基準料號</th>
                  <th className={th}>廠牌料號</th>
                  <th className={th}>廠牌</th>
                  <th className={th}>品名</th>
                  <th className={th}>出貨倉庫</th>
                  <th className={`${th} text-right`}>該倉剩餘</th>
                  <th className={`${th} text-right`}>報價數量</th>
                  <th className={th}>上次客戶日</th>
                  <th className={`${th} text-right`}>上次客戶價</th>
                  <th className={th}>上次零件日</th>
                  <th className={`${th} text-right`}>上次零件價</th>
                  <th className={`${th} text-right`}>此次報價</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => {
                  const on = checked.has(c.id);
                  const sel = i === hi;
                  const avail = Number(c.warehouseAvailable);
                  return (
                    <tr
                      key={c.id}
                      data-cand-row={i}
                      onClick={() => setHi(i)}
                      className={`cursor-pointer ${sel ? 'bg-[var(--primary)]/10' : i % 2 ? 'bg-foreground/[0.03]' : ''} ${on ? 'ring-1 ring-inset ring-primary/40' : ''}`}
                    >
                      <td className={`${td} text-center`}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(c.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 accent-primary"
                        />
                      </td>
                      <td className={`${td} font-mono`}>
                        {c.code}
                        {c.role === 1 ? <span className="ml-1 rounded bg-primary/15 px-1 text-[10px] text-primary">主件</span> : null}
                      </td>
                      <td className={`${td} font-mono text-muted-foreground`}>{c.secCode ?? '—'}</td>
                      <td className={td}>{c.brandName ?? '—'}</td>
                      <td className={td}>{c.name}</td>
                      <td className={`${td} text-muted-foreground`}>{whName}</td>
                      <td className={`${td} text-right tabular-nums ${avail > 0 ? 'font-semibold text-emerald-600' : 'text-muted-foreground'}`}>{fmt(c.warehouseAvailable)}</td>
                      <td className={`${td} text-right`}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={qty[c.id] ?? '1'}
                          onChange={(e) => setQty((m) => ({ ...m, [c.id]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          className={cellInput}
                        />
                      </td>
                      <td className={td}>{fmtDate(c.customerLastDate)}</td>
                      <td className={`${td} text-right tabular-nums`}>{c.customerLastAmount ? fmt(c.customerLastAmount) : '—'}</td>
                      <td className={td}>{fmtDate(c.partLastDate)}</td>
                      <td className={`${td} text-right tabular-nums`}>{c.partLastAmount ? fmt(c.partLastAmount) : '—'}</td>
                      <td className={`${td} text-right`}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={price[c.id] ?? ''}
                          onChange={(e) => setPrice((m) => ({ ...m, [c.id]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          className={`${cellInput} w-24 font-semibold`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/50 px-4 py-2.5">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
            關閉
          </button>
          <button
            type="button"
            disabled={checked.size === 0}
            onClick={() => setConfirmOpen(true)}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            確認報價（{checked.size}）
          </button>
        </div>
      </div>

      {/* 確認報價視窗 */}
      {confirmOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h2 className="text-sm font-semibold">確認報價（{checked.size} 項）</h2>
            <div className="max-h-72 space-y-1 overflow-auto">
              {rows
                .filter((c) => checked.has(c.id))
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded border border-border/40 px-2 py-1 text-xs">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-mono">{c.code}</span>　{c.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {qty[c.id] || '1'} × {fmt(price[c.id] || '0')}
                    </span>
                  </div>
                ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded border px-4 py-1.5 text-sm">
                返回
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void doConfirm()}
                className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {busy ? '加入中…' : '確認加入報價單'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
