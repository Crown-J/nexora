// apps/nx-ui/src/features/nx08/hooks/useExportExcel.ts
// v1.2 階段 H P5：6 報表通用 Excel 匯出 hook（sheetjs / xlsx）
//
// 範式：
//   - 多 sheet 輸出（主表 + 明細 + meta）
//   - meta sheet 自動包含：匯出時間 / 期間 / 角度 / 其他篩選條件
//   - 數字欄自動 number 型別、文字欄保留原樣
//   - 檔名範式：{報表名稱}_{今日 YYYYMMDD}.xlsx
'use client';

import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';

export type ExportSheet = {
  name: string;
  /** 列陣（key = header label、value = cell 值） */
  rows: Array<Record<string, unknown>>;
  /** 指定欄位順序（不傳預設用第一列 keys） */
  columnOrder?: string[];
};

export type ExportOptions = {
  /** 檔名（不含 .xlsx 副檔名、會自動 append 日期 + 副檔名） */
  fileName: string;
  /** 多 sheet（至少一張） */
  sheets: ExportSheet[];
  /** meta 資訊（會額外加一張 _meta sheet：期間 / 角度 / 篩選條件…） */
  meta?: Record<string, string | number | undefined>;
};

function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function useExportExcel() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToExcel = useCallback(async (opts: ExportOptions) => {
    setExporting(true);
    setError(null);
    try {
      const wb = XLSX.utils.book_new();

      // meta sheet（放第一張、譯給使用者「這份 Excel 對應什麼期間/篩選」）
      if (opts.meta && Object.keys(opts.meta).length > 0) {
        const metaRows = [
          { 項目: '報表名稱', 值: opts.fileName },
          { 項目: '匯出時間', 值: new Date().toLocaleString('zh-TW') },
          ...Object.entries(opts.meta)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => ({ 項目: k, 值: String(v) })),
        ];
        const metaWs = XLSX.utils.json_to_sheet(metaRows);
        metaWs['!cols'] = [{ wch: 18 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, metaWs, '_匯出資訊');
      }

      // 主表 sheets
      for (const sheet of opts.sheets) {
        if (sheet.rows.length === 0) {
          // 空表也塞、避免使用者誤會
          const emptyWs = XLSX.utils.aoa_to_sheet([['（本期無資料）']]);
          XLSX.utils.book_append_sheet(wb, emptyWs, sheet.name);
          continue;
        }
        const ws = XLSX.utils.json_to_sheet(sheet.rows, {
          header: sheet.columnOrder,
        });
        // 自動欄寬：取每欄最長字串 × 1.2、最小 8、最大 30
        const keys = sheet.columnOrder ?? Object.keys(sheet.rows[0] ?? {});
        ws['!cols'] = keys.map((k) => {
          const maxLen = Math.max(
            k.length,
            ...sheet.rows.map((r) => String(r[k] ?? '').length),
          );
          return { wch: Math.min(30, Math.max(8, Math.ceil(maxLen * 1.2))) };
        });
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      }

      const fileName = `${opts.fileName}_${todayStamp()}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      throw e;
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportToExcel, exporting, error };
}
