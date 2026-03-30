/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/SalesOrderWorkspace.tsx
 *
 * Purpose:
 * - 「建立銷貨單」mock：三區塊（客戶確認 → 商品明細 → 出貨方式）與 Enter 鍵流
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cx } from '@/shared/lib/cx';
import type { QuoteSnapshot } from '@/features/nx03/workflow/types';

const SO_BLOCK_IDS = ['nx03-so-block-1', 'nx03-so-block-2', 'nx03-so-block-3'] as const;

function scrollSoBlock(n: 1 | 2 | 3) {
  document.getElementById(SO_BLOCK_IDS[n - 1])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

type LineRow = { partNo: string; price: string; qty: string };

export function SalesOrderWorkspace({ snapshot }: { snapshot: QuoteSnapshot | null }) {
  const [custCode, setCustCode] = useState(snapshot?.customerCode ?? '');
  const [custName, setCustName] = useState(snapshot?.customerName ?? '');
  const [lines, setLines] = useState<LineRow[]>(() => [
    {
      partNo: snapshot?.partNo ?? '',
      price: snapshot?.unitPrice ?? '',
      qty: snapshot?.qty ?? '1',
    },
  ]);
  const [ship, setShip] = useState<'pickup' | 'delivery' | 'mail'>('pickup');
  const [doneOpen, setDoneOpen] = useState(false);

  const custCodeRef = useRef<HTMLInputElement>(null);
  const custNameRef = useRef<HTMLInputElement>(null);
  const partRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmLinesRef = useRef<HTMLButtonElement>(null);
  const shipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const donePrimaryRef = useRef<HTMLButtonElement>(null);

  const focusLineField = useCallback((line: number, field: 'part' | 'price' | 'qty') => {
    requestAnimationFrame(() => {
      if (field === 'part') partRefs.current[line]?.focus();
      if (field === 'price') priceRefs.current[line]?.focus();
      if (field === 'qty') qtyRefs.current[line]?.focus();
    });
  }, []);

  const onLineKeyDown = useCallback(
    (lineIdx: number, field: 'part' | 'price' | 'qty', e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (field === 'part') {
          focusLineField(lineIdx, 'price');
        } else if (field === 'price') {
          focusLineField(lineIdx, 'qty');
        } else {
          const nextLineIdx = lineIdx + 1;
          setLines((prev) => [...prev, { partNo: '', price: '', qty: '1' }]);
          window.setTimeout(() => partRefs.current[nextLineIdx]?.focus(), 0);
        }
        return;
      }
      if (e.key === 'ArrowDown' && field === 'qty' && lineIdx === lines.length - 1) {
        e.preventDefault();
        confirmLinesRef.current?.focus();
      }
    },
    [focusLineField, lines.length]
  );

  const onConfirmLinesKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      scrollSoBlock(3);
      requestAnimationFrame(() => shipRefs.current[0]?.focus());
    }
  };

  const onShipKeyDown = (idx: number, e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      shipRefs.current[Math.min(2, idx + 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      shipRefs.current[Math.max(0, idx - 1)]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setDoneOpen(true);
      requestAnimationFrame(() => donePrimaryRef.current?.focus());
    }
  };

  useEffect(() => {
    if (!doneOpen) return;
    const onDoc = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' && document.activeElement === donePrimaryRef.current) {
        ev.preventDefault();
        setDoneOpen(false);
      }
    };
    document.addEventListener('keydown', onDoc);
    return () => document.removeEventListener('keydown', onDoc);
  }, [doneOpen]);

  const blockClass = cx(
    'scroll-mt-4 rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm',
    'min-h-[min(50vh,520px)] flex flex-col'
  );

  return (
    <div className="space-y-6 pb-24">
      <section id="nx03-so-block-1" className={blockClass} aria-labelledby="nx03-so-h1">
        <h2 id="nx03-so-h1" className="text-lg font-semibold tracking-tight">
          ① 確認客戶資訊
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          已由報價帶入（可改）。<strong className="font-medium text-foreground">Enter</strong>：編號 → 名稱 → 商品明細區
        </p>
        <div className="mt-4 grid max-w-lg gap-4">
          <div>
            <label className="text-sm font-medium">客戶編號</label>
            <input
              ref={custCodeRef}
              value={custCode}
              onChange={(e) => setCustCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  custNameRef.current?.focus();
                }
              }}
              className={cx(
                'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 font-mono text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
              )}
            />
          </div>
          <div>
            <label className="text-sm font-medium">客戶名稱</label>
            <input
              ref={custNameRef}
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  scrollSoBlock(2);
                  requestAnimationFrame(() => focusLineField(0, 'part'));
                }
              }}
              className={cx(
                'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
              )}
            />
          </div>
        </div>
      </section>

      <section id="nx03-so-block-2" className={blockClass} aria-labelledby="nx03-so-h2">
        <h2 id="nx03-so-h2" className="text-lg font-semibold tracking-tight">
          ② 商品明細
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Enter</strong>：料號 → 售價 → 數量 → 下一筆；最後一列數量可按{' '}
          <strong className="font-medium text-foreground">↓</strong> 移至「確認明細」。
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border/50 bg-muted/30 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">料號</th>
                <th className="px-3 py-2 font-medium">售價</th>
                <th className="px-3 py-2 font-medium">數量</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="p-2">
                    <input
                      ref={(el) => {
                        partRefs.current[i] = el;
                      }}
                      value={row.partNo}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) => prev.map((x, j) => (j === i ? { ...x, partNo: v } : x)));
                      }}
                      onKeyDown={(e) => onLineKeyDown(i, 'part', e)}
                      placeholder="料號"
                      className="w-full rounded border border-border/60 bg-background/80 px-2 py-1.5 font-mono text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      ref={(el) => {
                        priceRefs.current[i] = el;
                      }}
                      value={row.price}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) => prev.map((x, j) => (j === i ? { ...x, price: v } : x)));
                      }}
                      onKeyDown={(e) => onLineKeyDown(i, 'price', e)}
                      placeholder="售價"
                      className="w-full rounded border border-border/60 bg-background/80 px-2 py-1.5 tabular-nums"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      ref={(el) => {
                        qtyRefs.current[i] = el;
                      }}
                      value={row.qty}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) => prev.map((x, j) => (j === i ? { ...x, qty: v } : x)));
                      }}
                      onKeyDown={(e) => onLineKeyDown(i, 'qty', e)}
                      placeholder="數量"
                      className="w-full rounded border border-border/60 bg-background/80 px-2 py-1.5 tabular-nums"
                      inputMode="numeric"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          ref={confirmLinesRef}
          onKeyDown={onConfirmLinesKeyDown}
          onClick={() => {
            scrollSoBlock(3);
            requestAnimationFrame(() => shipRefs.current[0]?.focus());
          }}
          className="mt-4 w-full max-w-md rounded-xl border border-amber-500/45 bg-amber-500/20 py-3 text-sm font-semibold text-amber-50 hover:bg-amber-500/30"
        >
          確認明細（Enter）→ 出貨方式
        </button>
      </section>

      <section id="nx03-so-block-3" className={blockClass} aria-labelledby="nx03-so-h3">
        <h2 id="nx03-so-h3" className="text-lg font-semibold tracking-tight">
          ③ 出貨方式
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">↑↓</strong> 選擇；<strong className="font-medium text-foreground">Enter</strong> 開啟完成確認
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: 'pickup' as const, label: '自取' },
              { id: 'delivery' as const, label: '送貨' },
              { id: 'mail' as const, label: '寄貨' },
            ] as const
          ).map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              ref={(el) => {
                shipRefs.current[idx] = el;
              }}
              onFocus={() => setShip(opt.id)}
              onClick={() => {
                setShip(opt.id);
                setDoneOpen(true);
                requestAnimationFrame(() => donePrimaryRef.current?.focus());
              }}
              onKeyDown={(e) => onShipKeyDown(idx, e)}
              className={cx(
                'rounded-xl border px-4 py-3 text-sm font-medium',
                ship === opt.id
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-50'
                  : 'border-border/60 hover:bg-muted/20'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <Dialog open={doneOpen} onOpenChange={setDoneOpen}>
        <DialogContent
          className="max-w-sm"
          onOpenAutoFocus={(ev) => {
            ev.preventDefault();
            requestAnimationFrame(() => donePrimaryRef.current?.focus());
          }}
        >
          <DialogHeader>
            <DialogTitle>確認完成</DialogTitle>
            <DialogDescription>出貨方式：{ship === 'pickup' ? '自取' : ship === 'delivery' ? '送貨' : '寄貨'}（mock）</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              ref={donePrimaryRef}
              className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
              onClick={() => setDoneOpen(false)}
            >
              完成（Enter）
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
