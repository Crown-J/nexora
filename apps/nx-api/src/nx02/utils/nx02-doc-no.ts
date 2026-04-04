/**
 * File: apps/nx-api/src/nx02/utils/nx02-doc-no.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-CORE-UTL-002：產生開帳存／盤點單 doc_no（VARCHAR(16)）
 *
 * Notes:
 * - 規格為 IN-YYYYMM-倉碼-流水，欄位僅 16 字元 → 壓縮為 IN|YYMM|倉碼3|流水7（共 16）
 * - @FUNCTION_CODE NX02-CORE-UTL-002-F01
 */

import type { Prisma } from 'db-core';

/**
 * @FUNCTION_CODE NX02-CORE-UTL-002-F01
 */
export function warehouseCodeTo3(code: string): string {
  const s = String(code ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  const base = s || 'WHX';
  return (base + 'XXX').slice(0, 3);
}

function yymm(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return String(y).slice(2) + String(m).padStart(2, '0');
}

function buildPrefix(kind: 'IN' | 'SL', refDate: Date, warehouseCode: string): string {
  return `${kind}${yymm(refDate)}${warehouseCodeTo3(warehouseCode)}`;
}

function nextSeqFromLast(lastDocNo: string | undefined, prefix: string): number {
  if (!lastDocNo || !lastDocNo.startsWith(prefix)) return 1;
  const suf = lastDocNo.slice(prefix.length);
  const n = parseInt(suf, 10);
  return Number.isFinite(n) && n >= 0 ? n + 1 : 1;
}

/**
 * @FUNCTION_CODE NX02-CORE-UTL-002-F02
 */
export async function allocateInitDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  refDate: Date,
  warehouseCode: string,
): Promise<string> {
  const prefix = buildPrefix('IN', refDate, warehouseCode);
  const last = await tx.nx02Init.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  const seq = nextSeqFromLast(last?.docNo, prefix);
  if (seq > 9_999_999) throw new Error('init doc_no sequence overflow');
  return `${prefix}${String(seq).padStart(7, '0')}`;
}

/**
 * @FUNCTION_CODE NX02-CORE-UTL-002-F03
 */
export async function allocateStockTakeDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  refDate: Date,
  warehouseCode: string,
): Promise<string> {
  const prefix = buildPrefix('SL', refDate, warehouseCode);
  const last = await tx.nx02StockTake.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  const seq = nextSeqFromLast(last?.docNo, prefix);
  if (seq > 9_999_999) throw new Error('stock take doc_no sequence overflow');
  return `${prefix}${String(seq).padStart(7, '0')}`;
}
