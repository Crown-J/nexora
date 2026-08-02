// apps/nx-ui/src/features/nx04/quote/ui/BatchInstantQuoteDialog.tsx
// 批次即時報價（執行長 2026-07-11 S01 走查）：主視窗右欄 Space 標記多顆 → Alt+Q（原 F4）→ 對同一客戶一次報多顆。
//   選客戶一次 → 每顆自動帶價（近一月本客戶報價/成交較近者、否則建議售價）→ 逐列量/價（價留白＝略過不報）
//   → 存 N 筆 INSTANT 報價紀錄；附「給客戶的訊息」多行複製（貼通訊軟體、格式對齊單筆即時報價）。
'use client';

import { Copy, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord } from '@data/endpoints/nx04/record/api/record';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from './CustomerPicker';

export type BatchQuoteItem = { partId: string; code: string; name: string };

// 報價金額格式（對齊 InstantQuoteDialog / SalesFlowHub formatNt）
function formatNt(n: number): string {
  if (n < 100 && n !== Math.floor(n)) return n.toFixed(2);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export function BatchInstantQuoteDialog({
  items,
  onClose,
}: {
  items: BatchQuoteItem[];
  onClose: () => void;
}) {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [rows, setRows] = useState<Record<string, { qty: string; price: string }>>(() =>
    Object.fromEntries(items.map((i) => [i.partId, { qty: '1', price: '' }])),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 選客戶 → 各顆帶價（近一月本客戶報價/成交較近者、否則建議售價）；使用者已打字的列不覆蓋
  const handlePickCustomer = async (c: PickedCustomer) => {
    setCustomer(c);
    setErr(null);
    // 帶客戶預設出貨倉錨定 F2 視窗（沿用單筆即時報價的事件、feature 層不 import design 內部）
    if (c.defaultWarehouseId) {
      window.dispatchEvent(
        new CustomEvent('nx-f2-context-warehouse', {
          detail: {
            warehouseId: c.defaultWarehouseId,
            warehouseName: c.defaultWarehouseName ?? undefined,
            label: '客戶倉',
          },
        }),
      );
    }
    await Promise.all(
      items.map(async (it) => {
        try {
          const intel = await getQuotePriceIntel(c.id, it.partId);
          const cq = intel.sameCustomerQuote;
          const cs = intel.sameCustomerSale;
          const recent = cq && cs ? (cq.date >= cs.date ? cq : cs) : (cq ?? cs);
          const p = recent?.amount ?? intel.suggestedPrice ?? '';
          if (p === '') return;
          setRows((prev) => {
            const cur = prev[it.partId];
            if (!cur || cur.price !== '') return prev; // 已手填不覆蓋
            return { ...prev, [it.partId]: { ...cur, price: p } };
          });
        } catch {
          /* 查不到不擋 */
        }
      }),
    );
  };

  const setRow = (partId: string, patch: Partial<{ qty: string; price: string }>) =>
    setRows((prev) => ({ ...prev, [partId]: { ...prev[partId], ...patch } }));

  // 給客戶的訊息：有填價的列每列一行、多行時附小計行數（貼通訊軟體）
  const copyText = useMemo(() => {
    const lines = items
      .map((it) => {
        const r = rows[it.partId];
        const p = Number(r?.price);
        if (!r || r.price === '' || !(p >= 0)) return null;
        const qtyPart = Number(r.qty) > 1 ? `　數量 ${Number(r.qty)}` : '';
        return `${it.code} ${it.name}${qtyPart}　報價 NT$ ${formatNt(p)}`;
      })
      .filter((l): l is string => l !== null);
    return lines.join('\n');
  }, [items, rows]);

  async function submit() {
    if (!customer) {
      setErr('請先選客戶');
      return;
    }
    const valid = items.filter((it) => {
      const r = rows[it.partId];
      return r && r.price !== '' && Number(r.qty) > 0 && Number(r.price) >= 0;
    });
    if (valid.length === 0) {
      setErr('至少填一顆的量價（價留白＝略過不報）');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      for (const it of valid) {
        const r = rows[it.partId];
        await createQuoteRecord({
          customerId: customer.id,
          partId: it.partId,
          qty: Number(r.qty),
          unitPrice: Number(r.price),
          warehouseId: customer.defaultWarehouseId ?? undefined,
          source: 'INSTANT',
        });
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '批次報價失敗');
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full rounded border bg-background px-2 py-1 text-sm tabular-nums text-right';
  const validCount = items.filter((it) => {
    const r = rows[it.partId];
    return r && r.price !== '' && Number(r.qty) > 0 && Number(r.price) >= 0;
  }).length;

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="批次即時報價"
      backdropClassName="bg-black/50 backdrop-blur-sm"
      dialogClassName="rounded-xl border border-border bg-card p-5 shadow-2xl"
      dialogStyle={{ width: 'min(780px, 96vw)', maxHeight: 'min(720px, 92vh)' }}
    >
      <div className="flex max-h-[inherit] flex-col space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            批次即時報價
            <span className="ml-2 font-mono text-[14px] text-muted-foreground">{items.length} 顆</span>
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">客戶 *</span>
          <CustomerPicker autoFocus onPick={(c) => void handlePickCustomer(c)} onCommit={() => {}} />
        </label>

        {customer ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">料號／品名</th>
                  <th className="w-20 px-2 py-1.5 text-right">數量</th>
                  <th className="w-28 px-2 py-1.5 text-right">報價單價</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const r = rows[it.partId];
                  return (
                    <tr key={it.partId} className="border-b border-border/40 last:border-b-0">
                      <td className="px-2 py-1.5">
                        <span className="font-mono text-[14px] text-muted-foreground">{it.code}</span>
                        <span className="ml-2">{it.name}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          ref={(el) => {
                            qtyRefs.current[i] = el;
                          }}
                          type="number"
                          min="0"
                          step="1"
                          value={r?.qty ?? '1'}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setRow(it.partId, { qty: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              priceRefs.current[i]?.focus();
                            }
                          }}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          ref={(el) => {
                            priceRefs.current[i] = el;
                          }}
                          type="number"
                          min="0"
                          step="0.01"
                          value={r?.price ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setRow(it.partId, { price: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const next = qtyRefs.current[i + 1];
                              if (next) next.focus();
                              else void submit();
                            }
                          }}
                          placeholder="留白＝不報"
                          className={`${inputCls} font-semibold`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {copyText ? (
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">給客戶的訊息（複製貼通訊軟體）</span>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(copyText)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/40"
                  >
                    <Copy className="size-3.5" />
                    複製
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={Math.min(6, Math.max(2, copyText.split('\n').length))}
                  value={copyText}
                  className="w-full resize-y rounded-md border border-border bg-muted/20 px-2 py-2 font-mono text-[11px] leading-relaxed text-foreground"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {err ? <div className="text-xs text-destructive">{err}</div> : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
            取消
          </button>
          <button
            type="button"
            disabled={busy || !customer || validCount === 0}
            onClick={() => void submit()}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? '報價中…' : `確認報價（存 ${validCount} 筆紀錄）`}
          </button>
        </div>
      </div>
    </FocusLockedDialog>
  );
}
