/**
 * File: apps/nx-api/src/nx01/utils/nx01-doc-no.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-CORE-UTL-001：產生 RFQ／PO／RR／PR 單號（與 NX02 開帳存相同 16 字元規則：前綴2 + YYMM4 + 倉3 + 流水7）
 *
 * Notes:
 * - 規格文件亦描述帶連字號之展示格式；DB 存儲採無連字號固定長度以利排序與唯一索引。
 *
 * @FUNCTION_CODE NX01-CORE-UTL-001-F01
 */

import type { Prisma } from 'db-core';

import { warehouseCodeTo3 } from '../../nx02/utils/nx02-doc-no';

function yymm(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return String(y).slice(2) + String(m).padStart(2, '0');
}

function buildPrefix(kind: 'RF' | 'PO' | 'RR' | 'PR', refDate: Date, warehouseCode: string): string {
  return `${kind}${yymm(refDate)}${warehouseCodeTo3(warehouseCode)}`;
}

function nextSeqFromLast(lastDocNo: string | undefined, prefix: string): number {
  if (!lastDocNo || !lastDocNo.startsWith(prefix)) return 1;
  const suf = lastDocNo.slice(prefix.length);
  const n = parseInt(suf, 10);
  return Number.isFinite(n) && n >= 0 ? n + 1 : 1;
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-001-F02
 */
export async function allocateRfqDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  refDate: Date,
  warehouseCode: string,
): Promise<string> {
  const prefix = buildPrefix('RF', refDate, warehouseCode);
  const last = await tx.nx01Rfq.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  const seq = nextSeqFromLast(last?.docNo, prefix);
  if (seq > 9_999_999) throw new Error('rfq doc_no sequence overflow');
  return `${prefix}${String(seq).padStart(7, '0')}`;
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-001-F03
 */
export async function allocatePoDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  refDate: Date,
  warehouseCode: string,
): Promise<string> {
  const prefix = buildPrefix('PO', refDate, warehouseCode);
  const last = await tx.nx01Po.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  const seq = nextSeqFromLast(last?.docNo, prefix);
  if (seq > 9_999_999) throw new Error('po doc_no sequence overflow');
  return `${prefix}${String(seq).padStart(7, '0')}`;
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-001-F04
 */
export async function allocateRrDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  refDate: Date,
  warehouseCode: string,
): Promise<string> {
  const prefix = buildPrefix('RR', refDate, warehouseCode);
  const last = await tx.nx01Rr.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  const seq = nextSeqFromLast(last?.docNo, prefix);
  if (seq > 9_999_999) throw new Error('rr doc_no sequence overflow');
  return `${prefix}${String(seq).padStart(7, '0')}`;
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-001-F05
 */
export async function allocatePrDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  refDate: Date,
  warehouseCode: string,
): Promise<string> {
  const prefix = buildPrefix('PR', refDate, warehouseCode);
  const last = await tx.nx01Pr.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  const seq = nextSeqFromLast(last?.docNo, prefix);
  if (seq > 9_999_999) throw new Error('pr doc_no sequence overflow');
  return `${prefix}${String(seq).padStart(7, '0')}`;
}
