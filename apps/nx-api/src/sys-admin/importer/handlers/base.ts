// apps/nx-api/src/sys-admin/importer/handlers/base.ts
// v1.2 對齊軌 C-FU：importer handler 共用介面 + 工具

import type { PrismaClient } from 'db-core';

export interface HandlerContext {
  tenantId: string;
  userId: string;
  prisma: PrismaClient;
  /// 資料起算點（v1.2 §12.3、起算前歷史只進查詢、不計入報表）
  dataStartDate: Date | null;
}

export interface HandlerResult {
  imported: number;
  /// 起算點前的「歷史筆數」（給 UI 顯示）
  historicalCount?: number;
  /// row-level 錯誤
  errors: { rowNo: number; reason: string }[];
}

export interface ImportRow {
  rowNo: number;
  data: Record<string, string>;
}

/// 取得有資料的 rows（skip 4 列 header / hint / example / 空、skip 全空 row）
export function extractDataRows(
  rawRows: unknown[][],
  fieldsByCol: string[],
): ImportRow[] {
  const dataRows = rawRows.slice(3);
  const result: ImportRow[] = [];
  dataRows.forEach((row, i) => {
    const rowNo = i + 4;
    const allEmpty = row.every((v) => v == null || String(v).trim() === '');
    if (allEmpty) return;
    const data: Record<string, string> = {};
    fieldsByCol.forEach((field, j) => {
      data[field] = String((row as unknown[])[j] ?? '').trim();
    });
    result.push({ rowNo, data });
  });
  return result;
}

/// 解析「是 / 否」→ boolean、預設 true
export function parseYesNo(value: string | undefined, defaultValue = true): boolean {
  if (!value) return defaultValue;
  const v = value.trim();
  if (v === '是' || v === 'Y' || v === 'YES' || v === 'TRUE' || v === '1') return true;
  if (v === '否' || v === 'N' || v === 'NO' || v === 'FALSE' || v === '0') return false;
  return defaultValue;
}

/// 解析數字、空白 / 非數字 回 null
export function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/// 解析日期（YYYY-MM-DD / YYYY/MM/DD）、無效回 null
export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const v = value.trim().replace(/\//g, '-');
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
