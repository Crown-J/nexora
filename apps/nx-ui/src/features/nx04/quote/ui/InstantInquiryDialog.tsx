// apps/nx-ui/src/features/nx04/quote/ui/InstantInquiryDialog.tsx
// 即時詢價對話框（NX04 紀錄表 B1）：F2 找到料 → 一鍵詢這顆同行的價 → 建詢價紀錄表單筆（調貨用）。
//   選同行(partner O) → 填量/價（同行報我的價）→ 建紀錄。餵調貨單拉入（B3）。
'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { createInquiryRecord } from '@data/endpoints/nx04/record/api/record';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from './CustomerPicker';

export function InstantInquiryDialog({
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
  onDone?: (recordId: string) => void;
}) {
  const [partner, setPartner] = useState<PickedCustomer | null>(null);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!partner) {
      setErr('請先選同行');
      return;
    }
    if (Number(qty) <= 0 || Number(price) < 0) {
      setErr('數量需大於 0、單價不可負');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const rec = await createInquiryRecord({
        sourcePartnerId: partner.id,
        partId,
        qty: Number(qty),
        unitPrice: Number(price),
      });
      onDone?.(rec.id);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '即時詢價失敗');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="即時詢價"
      backdropClassName="bg-black/50 backdrop-blur-sm"
      dialogClassName="rounded-xl border border-border bg-card p-5 shadow-2xl"
      dialogStyle={{ width: 'min(560px, 96vw)' }}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">即時詢價（調貨）</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded border border-border/50 bg-muted/30 px-3 py-2 text-sm">
          <span className="font-mono text-muted-foreground">{code}</span>　{name}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">同行 *</span>
          <CustomerPicker partnerType="O" autoFocus onPick={setPartner} onCommit={() => {}} />
        </label>

        {partner ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">數量（量價條件）</span>
              <input type="number" min="0" step="1" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputCls} tabular-nums`} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">同行報價（調貨成本）</span>
              <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputCls} font-semibold tabular-nums`} autoFocus />
            </label>
          </div>
        ) : null}

        {err ? <div className="text-xs text-destructive">{err}</div> : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
            取消
          </button>
          <button
            type="button"
            disabled={busy || !partner}
            onClick={() => void submit()}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? '詢價中…' : '確認詢價（存為紀錄）'}
          </button>
        </div>
      </div>
    </FocusLockedDialog>
  );
}
