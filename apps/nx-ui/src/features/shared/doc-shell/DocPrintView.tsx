// apps/nx-ui/src/features/shared/doc-shell/DocPrintView.tsx
// NX-DOC-PRINT：單據列印/匯出共用元件（八張單共用；泛型 DocWorkbench 的姊妹件）
//   方案＝瀏覽器列印流（window.print）而非 PDF 產生庫：
//   · 中文字型免內嵌（pdf 庫要帶 10-20MB CJK 字型）、零依賴
//   · 「匯出 PDF」＝列印對話框選「另存為 PDF」——列印與匯出收斂成同一個預覽視窗
//   版面＝A4 直式：租戶抬頭(LOGO+中文名) + 單據標題 + 表頭欄位網格 + 明細表 + 合計 + 簽核欄
//   列印技術：portal 到 body + body.nx-print-mode class + @media print 隱藏 app 只留列印紙
'use client';

import { Printer, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';

export type DocPrintField = { label: string; value: string };
export type DocPrintColumn<T> = {
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  render: (item: T, index: number) => React.ReactNode;
};
export type DocPrintTotal = { label: string; value: string; strong?: boolean };

export type DocPrintProps<T> = {
  /** 單據標題（例：報 價 單 / 銷 貨 單） */
  title: string;
  docNo: string;
  /** 表頭欄位（兩欄網格排列） */
  fields: DocPrintField[];
  columns: DocPrintColumn<T>[];
  items: T[];
  getRowKey: (item: T, index: number) => string;
  /** 合計列（右下角直式） */
  totals?: DocPrintTotal[];
  /** 底部備註（例：單據備註、法務文字） */
  note?: string | null;
  /** 簽核欄（例：['製單', '主管', '倉管', '客戶簽收']） */
  signatures?: string[];
  onClose: () => void;
};

/** 列印用日期字串（單據產出時間戳、印在頁尾） */
const nowStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function DocPrintView<T>({
  title,
  docNo,
  fields,
  columns,
  items,
  getRowKey,
  totals = [],
  note,
  signatures = [],
  onClose,
}: DocPrintProps<T>) {
  const { tenantNameZh, tenantNameEn, tenantLogoUrl } = useSessionMe();

  // 列印模式 class：@media print 時隱藏 app、只留 #nx-print-portal（見下方 <style>）
  useEffect(() => {
    document.body.classList.add('nx-print-mode');
    return () => document.body.classList.remove('nx-print-mode');
  }, []);

  // Esc 關閉
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

  return createPortal(
    <div id="nx-print-portal">
      {/* 列印 CSS：portal 內自帶、不污染 globals */}
      <style>{`
        @media print {
          body.nx-print-mode > *:not(#nx-print-portal) { display: none !important; }
          #nx-print-portal { position: static !important; inset: auto !important; background: none !important; padding: 0 !important; overflow: visible !important; }
          #nx-print-portal .nx-print-toolbar { display: none !important; }
          #nx-print-portal .nx-print-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: auto !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      {/* 螢幕預覽層 */}
      <div
        className="fixed inset-0 z-[90] overflow-auto bg-black/50 p-6"
        onClick={onClose}
        style={{ colorScheme: 'light' }}
      >
        {/* 工具列（列印時隱藏） */}
        <div className="nx-print-toolbar sticky top-0 z-10 mx-auto mb-3 flex w-[210mm] max-w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-2 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <span className="text-sm font-medium">列印預覽　<span className="font-mono text-[14px] text-muted-foreground">{docNo}</span></span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">要存 PDF：列印對話框的目的地選「另存為 PDF」</span>
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
              <Printer className="h-4 w-4" />列印 / 存 PDF
            </button>
            <button type="button" onClick={onClose} className="rounded border px-2 py-1.5 text-sm" aria-label="關閉">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* A4 紙（螢幕上模擬、列印時就是內容本體）——固定亮色、黑字白底 */}
        <div
          className="nx-print-sheet mx-auto w-[210mm] max-w-full bg-white p-[12mm] text-black shadow-2xl"
          style={{ minHeight: '297mm', fontFamily: "'Microsoft JhengHei', 'PingFang TC', sans-serif" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 抬頭：LOGO + 公司名 + 單據標題 */}
          <div className="mb-1 flex items-center justify-center gap-3">
            {tenantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenantLogoUrl} alt="" className="h-10 w-10 object-contain" />
            ) : null}
            <div className="text-center">
              <div className="text-lg font-bold tracking-wider">{tenantNameZh || tenantNameEn || ''}</div>
              {tenantNameEn && tenantNameZh ? <div className="text-[10px] tracking-widest text-neutral-500">{tenantNameEn}</div> : null}
            </div>
          </div>
          <div className="mb-3 text-center text-xl font-bold tracking-[0.5em]">{title}</div>

          {/* 表頭欄位：兩欄網格 */}
          <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1 border-y border-black py-2 text-[12px]">
            {fields.map((f, i) => (
              <div key={i} className="flex">
                <span className="w-24 shrink-0 text-neutral-600">{f.label}：</span>
                <span className="min-w-0 flex-1 break-all font-medium">{f.value || '—'}</span>
              </div>
            ))}
          </div>

          {/* 明細表 */}
          <table className="w-full border-collapse text-[11px] leading-5">
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={i} className="border border-black bg-neutral-100 px-1.5 py-1 font-semibold" style={{ textAlign: c.align ?? 'left', width: c.width }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={getRowKey(it, idx)} style={{ breakInside: 'avoid' }}>
                  {columns.map((c, i) => (
                    <td key={i} className="border border-black px-1.5 py-1 align-top" style={{ textAlign: c.align ?? 'left' }}>
                      {c.render(it, idx)}
                    </td>
                  ))}
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="border border-black px-2 py-3 text-center text-neutral-500">（無明細）</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {/* 合計（右下直式）＋ 備註（左） */}
          <div className="mt-2 flex items-start justify-between gap-6 text-[12px]" style={{ breakInside: 'avoid' }}>
            <div className="min-w-0 flex-1">
              {note ? (
                <div>
                  <span className="text-neutral-600">備註：</span>
                  <span className="whitespace-pre-wrap break-all">{note}</span>
                </div>
              ) : null}
            </div>
            {totals.length ? (
              <div className="w-56 shrink-0 space-y-0.5">
                {totals.map((t, i) => (
                  <div key={i} className={`flex justify-between ${t.strong ? 'border-t border-black pt-0.5 text-[13px] font-bold' : ''}`}>
                    <span className="text-neutral-600">{t.label}</span>
                    <span className="tabular-nums">{t.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* 簽核欄 */}
          {signatures.length ? (
            <div className="mt-10 flex gap-6 text-[12px]" style={{ breakInside: 'avoid' }}>
              {signatures.map((s, i) => (
                <div key={i} className="flex-1">
                  <div className="mb-10 text-neutral-600">{s}：</div>
                  <div className="border-t border-black" />
                </div>
              ))}
            </div>
          ) : null}

          {/* 頁尾：單號 + 印出時間 */}
          <div className="mt-6 flex justify-between text-[10px] text-neutral-500">
            <span className="font-mono">{docNo}</span>
            <span>列印時間：{nowStamp()}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 金額格式（列印用、千分位） */
export const printMoney = (n: string | number | null | undefined) =>
  Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

// ─────────────────────────────────────────────
// ListPrintView — 列表層列印（W5 收尾 2026-07-11）
//   十張單列表的列印鈕共用：吃 DocWorkbench 的 exportCsv 設定（欄頭 + 取值），
//   泛型殼做一次、各單零改動。同一套瀏覽器列印流（另存 PDF = 匯出）。
//   版面＝A4 橫式（列表欄多）：租戶抬頭 + 「◯◯清單」+ 條件摘要 + 表格 + 頁尾時間戳。
// ─────────────────────────────────────────────

export function ListPrintView({
  title,
  header,
  rows,
  total,
  criteriaCount,
  onClose,
}: {
  /** 例：同行調貨單清單 */
  title: string;
  header: string[];
  /** 已照 header 順序攤平的字串列（來源＝exportCsv.line） */
  rows: (string | number)[][];
  /** 伺服器端總筆數（>列出筆數時摘要標示） */
  total: number;
  /** 生效中的查詢條件數（0=全部） */
  criteriaCount: number;
  onClose: () => void;
}) {
  const { tenantNameZh, tenantNameEn, tenantLogoUrl } = useSessionMe();

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

  const scopeText =
    criteriaCount > 0
      ? `查詢條件 ${criteriaCount} 項 · 列出 ${rows.length} 筆${total > rows.length ? `（符合共 ${total} 筆、僅列出目前載入的 ${rows.length} 筆）` : ''}`
      : `全部 · 列出 ${rows.length} 筆${total > rows.length ? `（共 ${total} 筆、僅列出目前載入的 ${rows.length} 筆）` : ''}`;

  return createPortal(
    <div id="nx-print-portal">
      <style>{`
        @media print {
          body.nx-print-mode > *:not(#nx-print-portal) { display: none !important; }
          #nx-print-portal { position: static !important; inset: auto !important; background: none !important; padding: 0 !important; overflow: visible !important; }
          #nx-print-portal .nx-print-toolbar { display: none !important; }
          #nx-print-portal .nx-print-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: auto !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[90] overflow-auto bg-black/50 p-6"
        onClick={onClose}
        style={{ colorScheme: 'light' }}
      >
        <div className="nx-print-toolbar sticky top-0 z-10 mx-auto mb-3 flex w-[297mm] max-w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-2 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <span className="text-sm font-medium">列印預覽　<span className="text-xs text-muted-foreground">{title}</span></span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">要存 PDF：列印對話框的目的地選「另存為 PDF」</span>
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
              <Printer className="h-4 w-4" />列印 / 存 PDF
            </button>
            <button type="button" onClick={onClose} className="rounded border px-2 py-1.5 text-sm" aria-label="關閉">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* A4 橫式紙 */}
        <div
          className="nx-print-sheet mx-auto w-[297mm] max-w-full bg-white p-[10mm] text-black shadow-2xl"
          style={{ minHeight: '210mm', fontFamily: "'Microsoft JhengHei', 'PingFang TC', sans-serif" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-center gap-3">
            {tenantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenantLogoUrl} alt="" className="h-9 w-9 object-contain" />
            ) : null}
            <div className="text-center">
              <div className="text-base font-bold tracking-wider">{tenantNameZh || tenantNameEn || ''}</div>
              {tenantNameEn && tenantNameZh ? <div className="text-[9px] tracking-widest text-neutral-500">{tenantNameEn}</div> : null}
            </div>
          </div>
          <div className="mb-1 text-center text-lg font-bold tracking-[0.4em]">{title}</div>
          <div className="mb-2 text-center text-[11px] text-neutral-600">{scopeText}</div>

          <table className="w-full border-collapse text-[10px] leading-4">
            <thead>
              <tr>
                {header.map((h, i) => (
                  <th key={i} className="border border-black bg-neutral-100 px-1 py-0.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} style={{ breakInside: 'avoid' }}>
                  {r.map((cell, ci) => (
                    <td key={ci} className="border border-black px-1 py-0.5 align-top">{String(cell ?? '')}</td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={header.length} className="border border-black px-2 py-3 text-center text-neutral-500">（無資料）</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="mt-4 flex justify-between text-[10px] text-neutral-500">
            <span>{title}</span>
            <span>列印時間：{nowStamp()}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
