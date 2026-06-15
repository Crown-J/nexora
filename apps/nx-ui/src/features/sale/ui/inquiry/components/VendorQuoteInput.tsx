// apps/nx-ui/src/features/sale/ui/inquiry/components/VendorQuoteInput.tsx
/**
 * R7 Phase 7-4:「新增同行報價」彈窗。
 *
 * 4 個輸入欄:
 *   - 同行編號（例:V001）
 *   - 同行名稱（例:桃園汽材）
 *   - 單價
 *   - 備註（選填;例:「3 天內可到」）
 *
 * 送出呼叫 useRFQStore.addVendorQuote,彈窗關閉由呼叫端決定（onSaved）。
 * canSubmit:編號 + 名稱 + 正整數單價都填了。
 */

'use client';

import { useState } from 'react';

import { cx } from '@design/utils/cx';
import { useRFQStore } from '../store';

interface VendorQuoteInputProps {
  rfqId: string;
  onSaved: (summary: { vendorName: string }) => void;
  onCancel: () => void;
}

export function VendorQuoteInput({ rfqId, onSaved, onCancel }: VendorQuoteInputProps) {
  const addVendorQuote = useRFQStore((s) => s.addVendorQuote);
  const [vendorCode, setVendorCode] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const priceNum = Number(price);
  const canSubmit =
    vendorCode.trim().length > 0 &&
    vendorName.trim().length > 0 &&
    Number.isFinite(priceNum) &&
    priceNum > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const trimmedName = vendorName.trim();
    addVendorQuote(rfqId, {
      vendorCode: vendorCode.trim(),
      vendorName: trimmedName,
      price: Math.round(priceNum),
      notes: notes.trim() || undefined,
    });
    onSaved({ vendorName: trimmedName });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-quote-input-title"
    >
      <div
        className="w-full max-w-md space-y-4 rounded-t-2xl border border-white/10 bg-[#1a1a1a] p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div id="vendor-quote-input-title" className="text-base text-white">
          新增同行報價
        </div>

        <Field label="同行編號">
          <input
            type="text"
            value={vendorCode}
            onChange={(e) => setVendorCode(e.target.value)}
            placeholder="例:V001"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#E8A020]/60 focus:outline-none"
          />
        </Field>

        <Field label="同行名稱">
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="例:桃園汽材"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#E8A020]/60 focus:outline-none"
          />
        </Field>

        <Field label="報價金額（單價）">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
              NT$
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white tabular-nums focus:border-[#E8A020]/60 focus:outline-none"
            />
          </div>
        </Field>

        <Field label="備註（選填）">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例:3 天內可到、需先付款"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#E8A020]/60 focus:outline-none"
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-lg border border-white/20 text-sm text-white/80 transition-colors hover:border-white/40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cx(
              'h-11 flex-[2] rounded-lg text-sm font-medium transition-colors',
              canSubmit
                ? 'bg-[#E8A020] text-black hover:bg-[#E8A020]/90'
                : 'cursor-not-allowed bg-white/10 text-white/40',
            )}
          >
            送出
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-white/50">{label}</span>
      {children}
    </label>
  );
}
