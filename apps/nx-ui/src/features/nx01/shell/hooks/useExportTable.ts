// apps/nx-ui/src/features/master-shell/hooks/useExportTable.ts
/**
 * 主檔列表三模式匯出（CSV / PDF / 列印）共用 utility。
 *
 * [2-1] 2026-06-06：NX-MANUAL-02 v2.0 §3.2「所見即所得」對齊：
 * 三種匯出統一由 caller 過濾「當前顯示欄位 + 篩選後資料列」後傳入、helper 不二次過濾。
 *
 * 設計取捨：
 * - CSV：blob download .csv（既有範式）
 * - PDF / 列印：都走「新視窗 + print CSS + window.print()」、共用同一份 HTML
 *   - PDF：user 在 print dialog 選「目的地：另存為 PDF」（Chrome / Edge / Safari 原生）
 *   - 列印：user 直接送印
 *   - 不引入新 npm 依賴、中文字 native 支援（瀏覽器系統字型）
 *
 * 為什麼不用 jspdf / pdfmake：
 * - jspdf 需 embed CJK 字型（多 MB / 字型授權）、檔案肥大
 * - pdfmake / react-pdf 對 ERP 表格列匯出過度設計
 * - 瀏覽器 print preview 已是業界 SaaS 通用範式（Stripe / Notion / Linear 均如此）
 */

// 2026-06-24 加 'xlsx'（執行長 keyboard-card 範本要 CSV/PDF/EXCEL 三選 1 + P 列印分開）
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'print';

/** 匯出欄位：label = 表頭顯示文字、get = 從 row 取 cell 文字 */
export type ExportColumn<T> = {
  label: string;
  get: (row: T) => string;
};

export type ExportTableOptions<T> = {
  /** CSV 檔名（不含副檔名）/ Print 視窗標題 + h1 */
  title: string;
  /** 視覺顯示欄位（caller 須已過濾「L 欄位面板隱藏的」）*/
  columns: ExportColumn<T>[];
  /** 篩選後的資料列（caller 須已套用 filters）*/
  rows: T[];
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function csvFieldEscape(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function nowText(): string {
  const d = new Date();
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function downloadCsv<T>(opts: ExportTableOptions<T>): void {
  const header = opts.columns.map((c) => c.label).join(',');
  const lines = opts.rows.map((r) =>
    opts.columns.map((c) => csvFieldEscape(c.get(r))).join(','),
  );
  const csv = [header, ...lines].join('\n');
  // BOM 讓 Excel 正確識別 UTF-8 中文
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.title}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openPrintPreview<T>(opts: ExportTableOptions<T>): void {
  const headHtml = opts.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const bodyHtml = opts.rows.length === 0
    ? `<tr><td colspan="${opts.columns.length}" class="empty">沒有資料</td></tr>`
    : opts.rows
        .map(
          (r) =>
            `<tr>${opts.columns.map((c) => `<td>${escapeHtml(c.get(r))}</td>`).join('')}</tr>`,
        )
        .join('');

  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body {
    font-family: "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", "Heiti TC", sans-serif;
    color: #111;
    font-size: 12px;
    margin: 0;
    padding: 16px;
    background: #fff;
  }
  /* 2026-06-18 執行長範式:user 自己按列印（不自動印）→ 加頂部工具列 */
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #fafafa;
    border-bottom: 1px solid #ddd;
    padding: 10px 16px;
    margin: -16px -16px 12px;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .toolbar .title { flex: 1; font-size: 13px; color: #333; font-weight: 600; }
  .toolbar button {
    font: inherit;
    font-size: 12px;
    padding: 6px 14px;
    border: 1px solid #888;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
  }
  .toolbar button.primary {
    background: #2563eb;
    color: #fff;
    border-color: #2563eb;
  }
  .toolbar button.primary:hover { background: #1e4fc5; }
  .toolbar button:not(.primary):hover { background: #f0f0f0; }
  h1 { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
  .meta { color: #666; font-size: 11px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td {
    border: 1px solid #888;
    padding: 4px 6px;
    text-align: left;
    vertical-align: top;
    word-break: break-all;
  }
  thead { background: #f0f0f0; }
  thead th { font-weight: 600; }
  tr { page-break-inside: avoid; }
  td.empty { text-align: center; color: #888; padding: 16px; }
  @media print {
    body { padding: 0; }
    .toolbar { display: none; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <span class="title">列印預覽 — ${escapeHtml(opts.title)}（${opts.rows.length} 筆）</span>
  <button type="button" onclick="window.close()">取消</button>
  <button type="button" class="primary" onclick="window.print()">列印</button>
</div>
<h1>${escapeHtml(opts.title)}</h1>
<div class="meta">列印時間：${nowText()}　|　共 ${opts.rows.length} 筆</div>
<table>
  <thead><tr>${headHtml}</tr></thead>
  <tbody>${bodyHtml}</tbody>
</table>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=1024,height=720');
  if (!w) {
    alert('瀏覽器擋下了列印視窗、請允許 popup 後重試。');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

async function downloadXlsx<T>(opts: ExportTableOptions<T>): Promise<void> {
  // 動態 import 避免擴 initial bundle（xlsx 是 ~200kb）
  const XLSX = await import('xlsx');
  const aoa: string[][] = [
    opts.columns.map((c) => c.label),
    ...opts.rows.map((r) => opts.columns.map((c) => c.get(r))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // 自動欄寬：每欄取該欄最長字串長度 × 1.5（粗估、CJK 半形字補正）
  ws['!cols'] = opts.columns.map((_, ci) => {
    const maxLen = aoa.reduce(
      (m, row) => Math.max(m, (row[ci] ?? '').length),
      0,
    );
    return { wch: Math.min(60, Math.max(8, maxLen * 1.5)) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.title.slice(0, 31)); // sheet name 上限 31
  XLSX.writeFile(wb, `${opts.title}.xlsx`);
}

/**
 * 四模式匯出統一入口。caller 端：
 *   const handleExport = useCallback(
 *     (format) => exportTable(format, { title, columns: visibleCols, rows: displayRows }),
 *     [...],
 *   );
 *
 * - csv：BOM UTF-8 csv blob download
 * - xlsx：真 .xlsx（aoa_to_sheet + 自動欄寬、xlsx 套件 dynamic import）
 * - pdf / print：共用 print preview 新視窗
 */
export function exportTable<T>(format: ExportFormat, opts: ExportTableOptions<T>): void {
  if (format === 'csv') {
    downloadCsv(opts);
    return;
  }
  if (format === 'xlsx') {
    void downloadXlsx(opts);
    return;
  }
  // pdf + print 共用 print preview；user 在 dialog 內選「另存 PDF」或「列印」
  openPrintPreview(opts);
}
