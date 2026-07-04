// apps/nx-ui/src/features/nx04/quote/ui/InstantQuoteDialog.tsx
// 即時報價對話框（執行長 2026-07-02 Step5B）：F2 找到料 → 一鍵報這顆 → 建 source=INSTANT 單行報價紀錄
//   選客戶 → 帶 5 格比價 + 自動帶價(近一個月本客戶價，否則建議售價) → 填量/價 → 建單
'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { addQuoteItem, createQuote, getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { PriceIntelPanel } from './PriceIntelPanel';

export function InstantQuoteDialog({
  partId,
  code,
  name,
  onClose,
  onDone,
}: {
  partId: string;
  code: string;
  name: string;
  onClose: () => void;
  onDone?: (quoteId: string) => void;
}) {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 選客戶 → 自動帶價：本客戶近一個月(報價或成交、取最近)否則建議售價
  const handlePickCustomer = async (c: PickedCustomer) => {
    setCustomer(c);
    setErr(null);
    try {
      const intel = await getQuotePriceIntel(c.id, partId);
      const cq = intel.sameCustomerQuote;
      const cs = intel.sameCustomerSale;
      const recent =
        cq && cs ? (cq.date >= cs.date ? cq : cs) : (cq ?? cs); // 兩者取日期較近
      setPrice(recent?.amount ?? intel.suggestedPrice ?? '');
    } catch {
      /* 查不到不擋 */
    }
  };

  async function submit() {
    if (!customer) {
      setErr('請先選客戶');
      return;
    }
    if (Number(qty) <= 0 || Number(price) < 0) {
      setErr('數量需大於 0、單價不可負');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const q = await createQuote({
        customerId: customer.id,
        quoteDate: new Date().toISOString().slice(0, 10),
        warehouseId: customer.defaultWarehouseId ?? undefined,
        source: 'INSTANT',
        taxRate: 5,
      });
      await addQuoteItem(q.id, {
        partId,
        qty: Number(qty),
        unitPriceSnapshot: Number(price),
        isSelected: true, // 即時報價=單行、就是這筆，計入
      });
      onDone?.(q.id);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '即時報價失敗');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="即時報價"
      backdropClassName="bg-black/50 backdrop-blur-sm"
      dialogClassName="rounded-xl border border-border bg-card p-5 shadow-2xl"
      dialogStyle={{ width: 'min(680px, 96vw)' }}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">即時報價</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded border border-border/50 bg-muted/30 px-3 py-2 text-sm">
          <span className="font-mono text-muted-foreground">{code}</span>　{name}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">客戶 *</span>
          <CustomerPicker autoFocus onPick={(c) => void handlePickCustomer(c)} onCommit={() => {}} />
        </label>

        {customer ? (
          <div className="space-y-2">
            <PriceIntelPanel customerId={customer.id} partId={partId} />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">數量（量價條件）</span>
                <input type="number" min="0" step="1" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputCls} tabular-nums`} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">報價單價</span>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputCls} font-semibold tabular-nums`} />
              </label>
            </div>
          </div>
        ) : null}

        {err ? <div className="text-xs text-destructive">{err}</div> : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
            取消
          </button>
          <button
            type="button"
            disabled={busy || !customer}
            onClick={() => void submit()}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? '報價中…' : '確認報價（存為紀錄）'}
          </button>
        </div>
      </div>
    </FocusLockedDialog>
  );
}
