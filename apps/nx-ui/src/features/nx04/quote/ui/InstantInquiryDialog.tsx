// apps/nx-ui/src/features/nx04/quote/ui/InstantInquiryDialog.tsx
// 即時詢價對話框（NX04 紀錄表 B1；2026-07-12 鍵盤流升級 3/7）：
//   F1 F7／F5 清單 Enter → 選同行(partner O) → 量 → 價（同行報我的價）→ Enter 存為詢價紀錄。
//   全鍵盤流：選定同行自動跳數量、Enter 逐欄、末欄 Enter 存檔、Esc 取消——
//   電話夾肩膀上單手能操作。存檔發 nx-inquiry-recorded：F5 清單刷新該料摘要＋
//   焦點回清單、直接再 Enter 記下一家（連打三家不斷流）。餵調貨單成本帶入（B3）。
'use client';

import { X } from 'lucide-react';
import { useRef, useState } from 'react';

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
  const [remark, setRemark] = useState(''); // 備註（如交期、規格、暫存條件）
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const remarkRef = useRef<HTMLInputElement>(null);
  // FocusLockedDialog 開窗會聚焦「第一個 focusable」（= 右上 ✕）——指定初始焦點在同行輸入框
  const partnerInputRef = useRef<HTMLInputElement>(null);

  const focusQty = () =>
    setTimeout(() => {
      qtyRef.current?.focus();
      qtyRef.current?.select();
    }, 30);

  async function submit() {
    if (!partner) {
      setErr('請先選同行');
      return;
    }
    if (Number(qty) <= 0 || price.trim() === '' || Number(price) < 0) {
      setErr('數量需大於 0、單價需填且不可負');
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
        remark: remark.trim() || undefined,
      });
      // F5 調貨詢價清單聽這個：刷新該料摘要 + 焦點回清單（連打下一家）
      window.dispatchEvent(new CustomEvent('nx-inquiry-recorded', { detail: { partId, recordId: rec.id } }));
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
      initialFocusRef={partnerInputRef}
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
          <span className="mb-1 block text-xs text-muted-foreground">同行 *（↑↓ 選、Enter 定）</span>
          <CustomerPicker
            partnerType="O"
            autoFocus
            inputRef={partnerInputRef}
            onPick={(p) => {
              setPartner(p);
              focusQty(); // 選定即跳數量、不用再按一次 Enter
            }}
            onCommit={focusQty}
          />
        </label>

        {partner ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">數量（量價條件）</span>
              <input
                ref={qtyRef}
                type="number"
                min="0"
                step="1"
                value={qty}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setQty(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    priceRef.current?.focus();
                    priceRef.current?.select();
                  }
                }}
                className={`${inputCls} tabular-nums`}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">同行報價（調貨成本）</span>
              <input
                ref={priceRef}
                type="number"
                min="0"
                step="0.01"
                value={price}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    remarkRef.current?.focus();
                    remarkRef.current?.select();
                  }
                }}
                className={`${inputCls} font-semibold tabular-nums`}
              />
            </label>
            <label className="col-span-2 text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">備註（選填；如交期、規格、暫存條件）</span>
              <input
                ref={remarkRef}
                type="text"
                maxLength={100}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!busy) void submit();
                  }
                }}
                placeholder="按 Enter 存檔"
                className={inputCls}
              />
            </label>
          </div>
        ) : null}

        {err ? <div className="text-xs text-destructive">{err}</div> : null}

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground/70">
            Enter 逐欄→存檔｜Esc 取消；存檔回清單、再 Enter 記下一家
          </span>
          <span className="flex gap-2">
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
          </span>
        </div>
      </div>
    </FocusLockedDialog>
  );
}
