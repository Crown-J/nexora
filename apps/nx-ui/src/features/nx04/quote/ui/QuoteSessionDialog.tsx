// apps/nx-ui/src/features/nx04/quote/ui/QuoteSessionDialog.tsx
// F2 即時報價查詢・工作台（執行長 2026-07-11 夜拍板・偉盟單一即時報價的解構）：
//   先選客戶「一次」→ 連續查料連續報價（每顆自動帶近月本客戶價/建議售價、看得到可出量與
//   五格歷史價參考）→ 累積成清單 → 產「給客戶的訊息」一鍵複製 → 存 N 筆 INSTANT 報價紀錄。
//   解決痛點：「每報一顆就要重選一次客戶」。庫存深查走 F1（兩者可疊開）。
'use client';

import { Copy, FilePlus, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord } from '@data/endpoints/nx04/record/api/record';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { PartPicker, type PickedPart } from './PartPicker';
import { PriceIntelPanel } from './PriceIntelPanel';

type SessionLine = {
  partId: string;
  code: string;
  name: string;
  availableTotal: string;
  qty: string;
  price: string;
};

// 報價金額格式（對齊 InstantQuoteDialog / SalesFlowHub formatNt）
function formatNt(n: number): string {
  if (n < 100 && n !== Math.floor(n)) return n.toFixed(2);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export function QuoteSessionDialog({ onClose }: { onClose: () => void }) {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [lines, setLines] = useState<SessionLine[]>([]);
  // 目前聚焦的料（五格歷史價參考面板跟著它）
  const [intelPartId, setIntelPartId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [pickerKey, setPickerKey] = useState(0); // 每加一行重置 PartPicker
  const partInputRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const priceRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const saved = savedCount !== null;

  // 關閉守門：有未存的行 → 確認才關（Esc / X / F2 toggle 都走這）
  const guardedClose = () => {
    if (!saved && lines.length > 0 && !window.confirm('報價還沒存、確定關閉？（清單會消失）')) return;
    onClose();
  };

  // 選客戶（一次）：帶客戶預設出貨倉錨定（同單筆即時報價事件、供疊開的 F1 視窗吃）
  const handlePickCustomer = (c: PickedCustomer) => {
    setCustomer(c);
    setErr(null);
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
  };

  // 查到料 → 立刻成行（自動帶價）→ 焦點跳該行數量 → Enter 鏈 → 回搜尋框查下一顆
  const handlePickPart = async (p: PickedPart) => {
    if (lines.some((l) => l.partId === p.id)) {
      // 重複查同顆 → 聚焦既有行、不重複加
      setIntelPartId(p.id);
      setTimeout(() => qtyRefs.current[p.id]?.focus(), 0);
      setPickerKey((k) => k + 1);
      return;
    }
    const line: SessionLine = {
      partId: p.id,
      code: p.code,
      name: p.name,
      availableTotal: p.availableTotal,
      qty: '1',
      price: '',
    };
    setLines((prev) => [...prev, line]);
    setIntelPartId(p.id);
    setPickerKey((k) => k + 1);
    setTimeout(() => qtyRefs.current[p.id]?.focus(), 0);
    // 自動帶價：近一月本客戶（報價/成交較近者）否則建議售價；使用者已打字不覆蓋
    if (!customer) return;
    try {
      const intel = await getQuotePriceIntel(customer.id, p.id);
      const cq = intel.sameCustomerQuote;
      const cs = intel.sameCustomerSale;
      const recent = cq && cs ? (cq.date >= cs.date ? cq : cs) : (cq ?? cs);
      const price = recent?.amount ?? intel.suggestedPrice ?? '';
      if (price === '') return;
      setLines((prev) =>
        prev.map((l) => (l.partId === p.id && l.price === '' ? { ...l, price } : l)),
      );
    } catch {
      /* 查不到不擋 */
    }
  };

  const setLine = (partId: string, patch: Partial<SessionLine>) =>
    setLines((prev) => prev.map((l) => (l.partId === partId ? { ...l, ...patch } : l)));

  const removeLine = (partId: string) => {
    setLines((prev) => prev.filter((l) => l.partId !== partId));
    setIntelPartId((cur) => (cur === partId ? null : cur));
  };

  const validLines = lines.filter(
    (l) => l.price !== '' && Number(l.qty) > 0 && Number(l.price) >= 0,
  );

  // 給客戶的訊息（貼通訊軟體、格式對齊三個既有複製入口）
  const copyText = useMemo(() => {
    return validLines
      .map((l) => {
        const qtyPart = Number(l.qty) > 1 ? `　數量 ${Number(l.qty)}` : '';
        return `${l.code} ${l.name}${qtyPart}　報價 NT$ ${formatNt(Number(l.price))}`;
      })
      .join('\n');
  }, [validLines]);

  async function submit() {
    if (!customer || validLines.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      for (const l of validLines) {
        await createQuoteRecord({
          customerId: customer.id,
          partId: l.partId,
          qty: Number(l.qty),
          unitPrice: Number(l.price),
          warehouseId: customer.defaultWarehouseId ?? undefined,
          source: 'INSTANT',
        });
      }
      setSavedCount(validLines.length);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '報價紀錄儲存失敗');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm tabular-nums text-right';

  return (
    <FocusLockedDialog
      open
      onClose={guardedClose}
      ariaLabel="即時報價查詢"
      backdropClassName="bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
      dialogClassName="flex flex-col rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)] animate-in fade-in zoom-in-95 duration-200"
      dialogStyle={{ width: 'min(980px, 96vw)', height: 'min(760px, 94vh)' }}
    >
      <>
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-3">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <FilePlus className="size-[18px] text-primary" />
          <h2 className="text-[15px] font-semibold tracking-wide">即時報價查詢</h2>
          {customer ? (
            <span className="ml-2 inline-flex items-center gap-1.5 rounded border border-primary/50 bg-primary/12 px-2 py-0.5 text-[12px] text-primary">
              <span className="font-mono">{customer.code}</span>
              {customer.name}
              {!saved && (
                <button
                  type="button"
                  onClick={() => {
                    if (lines.length === 0 || window.confirm('換客戶會清空目前清單、確定？')) {
                      setCustomer(null);
                      setLines([]);
                      setIntelPartId(null);
                    }
                  }}
                  className="ml-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  換客戶
                </button>
              )}
            </span>
          ) : null}
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/65">
            F2 · QUOTE SESSION
          </span>
          <button
            type="button"
            onClick={guardedClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-6 py-4">
          {/* Step 1：客戶（只選一次）*/}
          {!customer ? (
            <div className="mx-auto w-full max-w-md space-y-2 py-10">
              <div className="text-center text-sm text-muted-foreground">
                先選客戶——之後這通電話裡查幾顆報幾顆、都算這個客戶的
              </div>
              <CustomerPicker autoFocus onPick={handlePickCustomer} onCommit={() => {}} />
            </div>
          ) : (
            <>
              {/* Step 2：連續查料（報價完自動回到這裡）*/}
              {!saved && (
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    查下一顆料（選定即成行、自動帶近月價；Enter 量→價→回搜尋框）
                  </div>
                  <PartPicker key={pickerKey} inputRef={partInputRef} onPick={(p) => void handlePickPart(p)} />
                </div>
              )}

              {/* 清單 */}
              {lines.length > 0 ? (
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left">料號／品名</th>
                      <th className="w-20 px-2 py-1.5 text-right">可出</th>
                      <th className="w-20 px-2 py-1.5 text-right">數量</th>
                      <th className="w-28 px-2 py-1.5 text-right">報價單價</th>
                      {!saved ? <th className="w-10 px-2 py-1.5"></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => {
                      const avail = Number(l.availableTotal);
                      const short = Number(l.qty) > avail;
                      return (
                        <tr
                          key={l.partId}
                          onClick={() => setIntelPartId(l.partId)}
                          className={
                            l.partId === intelPartId
                              ? 'border-b border-border/40 bg-primary/[0.06] last:border-b-0'
                              : 'border-b border-border/40 last:border-b-0'
                          }
                        >
                          <td className="px-2 py-1.5">
                            <span className="font-mono text-xs text-muted-foreground">{l.code}</span>
                            <span className="ml-2">{l.name}</span>
                            {short ? (
                              <span className="ml-2 text-[11px] text-amber-600">缺 {Number(l.qty) - avail}（調貨/客訂）</span>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                            <span className={avail > 0 ? 'text-[#22D88F]' : 'text-destructive'}>{avail}</span>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              ref={(el) => {
                                qtyRefs.current[l.partId] = el;
                              }}
                              type="number"
                              min="0"
                              step="1"
                              value={l.qty}
                              disabled={saved}
                              onFocus={(e) => {
                                e.target.select();
                                setIntelPartId(l.partId);
                              }}
                              onChange={(e) => setLine(l.partId, { qty: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  priceRefs.current[l.partId]?.focus();
                                }
                              }}
                              className={inputCls}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              ref={(el) => {
                                priceRefs.current[l.partId] = el;
                              }}
                              type="number"
                              min="0"
                              step="0.01"
                              value={l.price}
                              disabled={saved}
                              onFocus={(e) => {
                                e.target.select();
                                setIntelPartId(l.partId);
                              }}
                              onChange={(e) => setLine(l.partId, { price: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  partInputRef.current?.focus(); // 回搜尋框查下一顆
                                }
                              }}
                              placeholder="留白＝不報"
                              className={`${inputCls} font-semibold`}
                            />
                          </td>
                          {!saved ? (
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeLine(l.partId)}
                                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label="移除"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  還沒有報價行——上面搜尋框查第一顆料
                </div>
              )}

              {/* 五格歷史價參考（跟著聚焦行）*/}
              {intelPartId && !saved ? (
                <PriceIntelPanel customerId={customer.id} partId={intelPartId} />
              ) : null}

              {/* 給客戶的訊息 */}
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
            </>
          )}

          {err ? <div className="text-xs text-destructive">{err}</div> : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/35 bg-background/35 px-6 py-3">
          {saved ? (
            <>
              <span className="mr-auto text-sm text-[#22D88F]">✅ 已存 {savedCount} 筆報價紀錄</span>
              <button type="button" onClick={onClose} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
                關閉
              </button>
            </>
          ) : (
            <>
              <span className="mr-auto text-[11px] text-muted-foreground/70">
                價留白＝該顆略過不報；訊息可先複製再存
              </span>
              <button type="button" onClick={guardedClose} className="rounded border px-4 py-1.5 text-sm">
                取消
              </button>
              <button
                type="button"
                disabled={busy || !customer || validLines.length === 0}
                onClick={() => void submit()}
                className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {busy ? '儲存中…' : `完成報價（存 ${validLines.length} 筆紀錄）`}
              </button>
            </>
          )}
        </div>
      </>
    </FocusLockedDialog>
  );
}
