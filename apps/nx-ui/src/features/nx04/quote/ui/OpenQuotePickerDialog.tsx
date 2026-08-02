// apps/nx-ui/src/features/nx04/quote/ui/OpenQuotePickerDialog.tsx
//
// 帶入報價（挑選器）——建立銷貨單「明細」那一段用。
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §6「兩條路都要留」
//
// ⭐ 這是路 A（先報價、之後才成交）的最後一哩：
//    客戶回頭要買時，把還沒成交的報價行勾一勾就變成銷貨明細，⛔ 不必重打一次。
//    帶入時會夾帶 quoteItemId，後端據此把報價標成已成交、
//    並把同客戶同料號的其他舊報價作廢（cascadeOnSoAdopt）。
//
// ⚠️ 浮層在 v3.0.0 只有三種例外，「挑選器」是其中之一（介面架構 §2.1）——
//    選完即關、⛔ 不承載流程。
//
// ⚠️ ⛔ 不顯示 minPrice：那是成本式底價（平均成本 ×(1+客戶等級毛利率)），
//    露出來業務就能反推進價。執行長 2026-08-02 拍板：業務⛔ 看不到成本。

'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { listOpenQuoteLines } from '@data/endpoints/nx04/so/api/so';
import type { OpenQuoteLine } from '@data/types/nx04/so';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

const num = (v: string | number | null | undefined) => Number(v ?? 0);
const money = (v: string | number | null | undefined) =>
  Number(v ?? 0).toLocaleString('zh-TW', { maximumFractionDigits: 2 });
const qtyText = (v: string | null | undefined) => String(Number(v ?? 0));

export function OpenQuotePickerDialog({
  customerId,
  customerName,
  /** 已經在明細裡的料號——同一支料⛔ 不重複帶入 */
  existingPartIds,
  onClose,
  onConfirm,
}: {
  customerId: string;
  customerName?: string | null;
  existingPartIds: string[];
  onClose: () => void;
  onConfirm: (picked: OpenQuoteLine[]) => void;
}) {
  const [rows, setRows] = useState<OpenQuoteLine[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hi, setHi] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const resp = await listOpenQuoteLines(customerId);
        // 還沒轉完的行才有意義；已經在明細裡的料號擋掉
        if (alive) setRows(resp.filter((r) => num(r.remainQty) > 0));
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

  const blocked = (r: OpenQuoteLine) => existingPartIds.includes(r.partId);

  const toggle = (r: OpenQuoteLine) => {
    if (blocked(r)) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(r.quoteItemId)) next.delete(r.quoteItemId);
      else next.add(r.quoteItemId);
      return next;
    });
  };

  const confirm = () => {
    const picked = rows.filter((r) => checked.has(r.quoteItemId));
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
      if (r) toggle(r);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      confirm();
    }
  };

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="帶入報價"
      backdropClassName="bg-black/50 backdrop-blur-sm"
      dialogClassName="flex flex-col rounded-xl border border-border bg-card shadow-2xl"
      dialogStyle={{ width: 'min(900px, 96vw)', height: 'min(620px, 92vh)' }}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <span className="nx-t-sub">帶入報價</span>
          {customerName && <span className="nx-hint ml-2">{customerName}</span>}
        </div>
        <button type="button" onClick={onClose} className="nx-btn-cell" aria-label="關閉">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-auto px-3 py-2" tabIndex={0} onKeyDown={onKey}>
        {loading ? (
          <div className="nx-hint p-6">載入中⋯</div>
        ) : err ? (
          <div className="nx-alert-danger m-4">{err}</div>
        ) : !rows.length ? (
          <div className="nx-hint p-6">這家客戶沒有還沒成交的報價。</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="nx-th w-10" />
                <th className="nx-th">報價單</th>
                <th className="nx-th">日期</th>
                <th className="nx-th">料號</th>
                <th className="nx-th">品名</th>
                <th className="nx-th text-right">
                  還沒轉
                  <div className="nx-th-note">可帶入的量</div>
                </th>
                <th className="nx-th text-right">報價</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const on = checked.has(r.quoteItemId);
                const dim = blocked(r);
                return (
                  <tr
                    key={r.quoteItemId}
                    data-hi={i}
                    onClick={() => {
                      setHi(i);
                      toggle(r);
                    }}
                    className={[
                      'border-b border-border/60',
                      dim ? 'opacity-50' : 'cursor-pointer',
                      i === hi ? 'bg-primary/10' : '',
                    ].join(' ')}
                    title={dim ? '這支料已經在明細裡了' : undefined}
                  >
                    <td className="nx-td">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded border-2 ${
                          on ? 'border-primary bg-primary/20' : 'border-border'
                        }`}
                      >
                        {on ? '✓' : ''}
                      </span>
                    </td>
                    <td className="nx-td">
                      <span className="nx-mono">{r.docNo}</span>
                    </td>
                    <td className="nx-td nx-hint">{r.quoteDate.slice(0, 10)}</td>
                    <td className="nx-td">
                      <span className="nx-mono">{r.partNo}</span>
                    </td>
                    <td className="nx-td">{r.partName}</td>
                    <td className="nx-td nx-num text-right">{qtyText(r.remainQty)}</td>
                    <td className="nx-td nx-num text-right">{money(r.unitPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border px-5 py-3">
        <span className="nx-hint">
          {checked.size ? `已選 ${checked.size} 筆` : '↑↓ 移動　·　空白鍵勾選　·　Enter 帶入'}
        </span>
        <div className="ml-auto flex gap-2">
          <button type="button" className="nx-btn" onClick={onClose}>
            取消
          </button>
          <button type="button" className="nx-btn-primary" disabled={!checked.size} onClick={confirm}>
            帶入 {checked.size || ''}
          </button>
        </div>
      </div>
    </FocusLockedDialog>
  );
}
