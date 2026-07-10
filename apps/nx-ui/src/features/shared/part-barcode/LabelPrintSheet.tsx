// apps/nx-ui/src/features/shared/part-barcode/LabelPrintSheet.tsx
// 偉盟 P2 2.6 Step 2 2026-07-11：條碼標籤列印（jsbarcode Code128、瀏覽器列印流）
//   版面＝A4 貼紙格：3×10（70×29.7mm 常見貼紙）/ 2×7（99.1×38.1mm 大標）兩版式
//   標籤內容：料號（粗體 mono）+ 品名（截斷）+ 條碼圖 + 條碼字串
//   列印技術同 DocPrintView：portal + body.nx-print-mode + @media print

'use client';

import JsBarcode from 'jsbarcode';
import { Printer, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type LabelData = {
  /** 條碼內容（預設條碼、無對照時 fallback 料號） */
  barcode: string;
  partNo: string;
  partName: string;
};

type LayoutKey = '3x10' | '2x7';

const LAYOUTS: Record<LayoutKey, { label: string; cols: number; cellH: string; barH: number }> = {
  '3x10': { label: '3×10（70×29.7mm）', cols: 3, cellH: '29.7mm', barH: 30 },
  '2x7': { label: '2×7（99.1×38.1mm）', cols: 2, cellH: '38.1mm', barH: 44 },
};

function BarcodeSvg({ value, height }: { value: string; height: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        displayValue: false,
        height,
        width: 1.4,
        margin: 0,
      });
    } catch {
      // 條碼含 Code128 不支援字元 → 留空、標籤仍有料號文字
    }
  }, [value, height]);
  return <svg ref={ref} style={{ maxWidth: '100%' }} />;
}

export function LabelPrintSheet({
  labels,
  title,
  onClose,
}: {
  labels: LabelData[];
  /** 預覽工具列顯示（例：進貨單 RR-xxx 標籤 / PT0001 標籤） */
  title: string;
  onClose: () => void;
}) {
  const [layout, setLayout] = useState<LayoutKey>('3x10');

  useEffect(() => {
    document.body.classList.add('nx-print-mode');
    return () => document.body.classList.remove('nx-print-mode');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const L = LAYOUTS[layout];

  return createPortal(
    <div id="nx-print-portal">
      <style>{`
        @media print {
          body.nx-print-mode > *:not(#nx-print-portal) { display: none !important; }
          #nx-print-portal { position: static !important; inset: auto !important; background: none !important; padding: 0 !important; overflow: visible !important; }
          #nx-print-portal .nx-print-toolbar { display: none !important; }
          #nx-print-portal .nx-print-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: auto !important; }
          #nx-print-portal .nx-label-cell { border-color: transparent !important; }
          @page { size: A4 portrait; margin: 6mm; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[90] overflow-auto bg-black/50 p-6"
        onClick={onClose}
        style={{ colorScheme: 'light' }}
      >
        <div className="nx-print-toolbar sticky top-0 z-10 mx-auto mb-3 flex w-[210mm] max-w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-2 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <span className="text-sm font-medium">標籤列印　<span className="text-xs text-muted-foreground">{title} · 共 {labels.length} 張</span></span>
          <div className="flex items-center gap-2">
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as LayoutKey)}
              className="rounded border bg-background px-2 py-1 text-xs"
            >
              {(Object.keys(LAYOUTS) as LayoutKey[]).map((k) => (
                <option key={k} value={k}>{LAYOUTS[k].label}</option>
              ))}
            </select>
            <span className="text-[11px] text-muted-foreground">格線僅預覽、列印不出</span>
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
              <Printer className="h-4 w-4" />列印
            </button>
            <button type="button" onClick={onClose} className="rounded border px-2 py-1.5 text-sm" aria-label="關閉">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* A4 貼紙版面 */}
        <div
          className="nx-print-sheet mx-auto w-[210mm] max-w-full bg-white p-[6mm] text-black shadow-2xl"
          style={{ fontFamily: "'Microsoft JhengHei', 'PingFang TC', sans-serif" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${L.cols}, 1fr)`,
              gridAutoRows: L.cellH,
            }}
          >
            {labels.map((lb, i) => (
              <div
                key={i}
                className="nx-label-cell flex flex-col items-center justify-center overflow-hidden border border-dashed border-neutral-300 px-2"
                style={{ breakInside: 'avoid' }}
              >
                <div className="w-full truncate text-center font-mono text-[10px] font-bold leading-tight">{lb.partNo}</div>
                <div className="w-full truncate text-center text-[8px] leading-tight text-neutral-700">{lb.partName}</div>
                <BarcodeSvg value={lb.barcode} height={L.barH} />
                <div className="w-full truncate text-center font-mono text-[7px] leading-tight text-neutral-600">{lb.barcode}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
