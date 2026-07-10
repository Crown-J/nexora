// apps/nx-ui/src/features/shared/part-barcode/PartBarcodeManager.tsx
// 偉盟 P2 2.6 2026-07-11：零件條碼維護介面（一料多條碼、可設預設、可刪）
// 範式對齊 PartPhotoManager（衛星 sub-page 掛載、同色票）

'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createPartBarcode,
  deletePartBarcode,
  listPartBarcodes,
  updatePartBarcode,
  type PartBarcodeRow,
} from '@data/endpoints/nx01/part-barcode/api/part-barcode';

// Step 2 2026-07-11：標籤列印（jsbarcode、A4 貼紙版面）
import { LabelPrintSheet } from './LabelPrintSheet';

const btnPrimary =
  'rounded-md border border-[#22D88F]/40 bg-[#22D88F]/10 px-3 py-1.5 text-xs font-medium text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50';
const btnSecondary =
  'rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-1 text-[10px] font-medium text-[#888892] hover:text-[#E8E8EC] disabled:opacity-50';
const btnDanger =
  'rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-2 py-1 text-[10px] font-medium text-[#E26060] hover:bg-[#E26060]/20 disabled:opacity-50';

export function PartBarcodeManager({ partId }: { partId: string }) {
  const [rows, setRows] = useState<PartBarcodeRow[]>([]);
  const [part, setPart] = useState<{ partNo: string; partName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [remark, setRemark] = useState('');
  // Step 2：標籤列印（份數 + 預覽開關）
  const [copies, setCopies] = useState('10');
  const [printOpen, setPrintOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await listPartBarcodes(partId);
      setRows(res.rows);
      setPart(res.part);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [partId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '操作失敗');
    } finally {
      setBusy(false);
    }
  };

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    await run(async () => {
      await createPartBarcode(partId, { barcode: code, remark: remark.trim() || undefined });
      setBarcode('');
      setRemark('');
    });
  }

  return (
    <div className="space-y-4">
      {/* 新增列：條碼輸入（掃描槍在輸入框直接打字＋Enter 即可） */}
      <form onSubmit={submitAdd} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-[#888892]">
          <span className="mb-1 block">條碼（掃描槍對準輸入框掃、或手動輸入）</span>
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="EAN / Code128 / QR 內容"
            className="w-64 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-1.5 font-mono text-xs text-[#E8E8EC]"
            autoFocus
          />
        </label>
        <label className="text-xs text-[#888892]">
          <span className="mb-1 block">備註（可空）</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="例：原廠盒條碼"
            className="w-48 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-1.5 text-xs text-[#E8E8EC]"
          />
        </label>
        <button type="submit" disabled={busy || !barcode.trim()} className={btnPrimary}>
          新增條碼
        </button>
      </form>

      {/* Step 2：標籤列印列（用預設條碼、沒掛條碼就用料號當條碼內容） */}
      <div className="flex flex-wrap items-end gap-2 rounded border border-[#2A2A30] bg-[#0A0A0C] p-3">
        <label className="text-xs text-[#888892]">
          <span className="mb-1 block">標籤份數</span>
          <input
            type="number"
            min="1"
            max="300"
            value={copies}
            onChange={(e) => setCopies(e.target.value)}
            className="w-24 rounded-md border border-[#2A2A30] bg-[#141418] px-2 py-1.5 text-xs tabular-nums text-[#E8E8EC]"
          />
        </label>
        <button
          type="button"
          disabled={!part || !Number(copies)}
          onClick={() => setPrintOpen(true)}
          className={btnPrimary}
        >
          列印標籤
        </button>
        <span className="text-[10px] text-[#5A5A60]">
          用預設條碼；未掛任何條碼時直接印料號（掃回來料號直比也通）
        </span>
      </div>

      {err ? <div className="rounded border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">{err}</div> : null}

      {loading ? (
        <div className="text-xs text-[#5A5A60]">載入中…</div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-dashed border-[#2A2A30] p-6 text-center text-xs text-[#5A5A60]">
          尚無條碼。第一條新增後自動設為預設（標籤列印用）。
        </div>
      ) : (
        <table className="w-full max-w-2xl text-xs">
          <thead>
            <tr className="border-b border-[#2A2A30] text-left text-[#888892]">
              <th className="py-1.5 pr-3">條碼</th>
              <th className="py-1.5 pr-3">預設</th>
              <th className="py-1.5 pr-3">備註</th>
              <th className="py-1.5 pr-3">建立日期</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[#1A1A1E]">
                <td className="py-1.5 pr-3 font-mono text-[#E8E8EC]">{r.barcode}</td>
                <td className="py-1.5 pr-3">
                  {r.isDefault ? (
                    <span className="rounded bg-[#22D88F]/15 px-1.5 py-0.5 text-[10px] text-[#22D88F]">預設</span>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => void run(() => updatePartBarcode(partId, r.id, { isDefault: true }))}
                      className={btnSecondary}
                    >
                      設為預設
                    </button>
                  )}
                </td>
                <td className="py-1.5 pr-3 text-[#888892]">{r.remark ?? '—'}</td>
                <td className="py-1.5 pr-3 text-[#5A5A60]">{r.createdAt.slice(0, 10)}</td>
                <td className="py-1.5 text-right">
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`刪除條碼 ${r.barcode}？（掃碼將不再對到此料號）`)) return;
                      void run(() => deletePartBarcode(partId, r.id));
                    }}
                    className={btnDanger}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {printOpen && part ? (
        <LabelPrintSheet
          title={`${part.partNo} 標籤`}
          labels={Array.from({ length: Math.min(300, Math.max(1, Number(copies) || 1)) }, () => ({
            barcode: rows.find((r) => r.isDefault)?.barcode ?? rows[0]?.barcode ?? part.partNo,
            partNo: part.partNo,
            partName: part.partName,
          }))}
          onClose={() => setPrintOpen(false)}
        />
      ) : null}
    </div>
  );
}
