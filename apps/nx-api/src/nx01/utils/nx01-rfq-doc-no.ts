/**
 * File: apps/nx-api/src/nx01/utils/nx01-rfq-doc-no.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-RFQ-UTL-001：產生 RFQ 單號（VARCHAR(20)；MW2 簡化）
 *
 * @FUNCTION_CODE NX01-RFQ-UTL-001-F01
 */

import type { Prisma } from 'db-core';

function yymm(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return String(y).slice(2) + String(m).padStart(2, '0');
}

function nextSeqFromLast(lastDocNo: string | undefined, prefix: string): number {
  if (!lastDocNo || !lastDocNo.startsWith(prefix)) return 1;
  const suf = lastDocNo.slice(prefix.length);
  const n = parseInt(suf, 10);
  return Number.isFinite(n) && n >= 0 ? n + 1 : 1;
}

/**
 * @FUNCTION_CODE NX01-RFQ-UTL-001-F01
 */
export async function allocateRfqDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  refDate: Date,
): Promise<string> {
  const prefix = `RFQ${yymm(refDate)}`;
  const last = await tx.nx01Rfq.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  const seq = nextSeqFromLast(last?.docNo, prefix);
  if (seq > 9_999_999) throw new Error('rfq doc_no sequence overflow');
  return `${prefix}${String(seq).padStart(7, '0')}`;
}
