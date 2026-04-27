// apps/nx-api/src/shared/nx02/nx02-doc-no.ts
import type { Prisma } from 'db-core';

export type DocKind = 'RF' | 'PO' | 'RR' | 'PR' | 'TI';

/**
 * 單號：[類型]-[YYYYMM]-[倉庫碼]-[5 碼流水]
 */
export async function allocDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  kind: DocKind,
  warehouseCode: string,
): Promise<string> {
  const y = new Date();
  const yyyymm = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `${kind}-${yyyymm}-${warehouseCode}-`;

  let last: { docNo: string } | null = null;
  switch (kind) {
    case 'RF':
      last = await tx.nx02Rfq.findFirst({
        where: { tenantId, docNo: { startsWith: prefix } },
        orderBy: { docNo: 'desc' },
        select: { docNo: true },
      });
      break;
    case 'PO':
      last = await tx.nx02Po.findFirst({
        where: { tenantId, docNo: { startsWith: prefix } },
        orderBy: { docNo: 'desc' },
        select: { docNo: true },
      });
      break;
    case 'RR':
      last = await tx.nx02Rr.findFirst({
        where: { tenantId, docNo: { startsWith: prefix } },
        orderBy: { docNo: 'desc' },
        select: { docNo: true },
      });
      break;
    case 'PR':
      last = await tx.nx02Pr.findFirst({
        where: { tenantId, docNo: { startsWith: prefix } },
        orderBy: { docNo: 'desc' },
        select: { docNo: true },
      });
      break;
    case 'TI':
      last = await tx.nx02Ti.findFirst({
        where: { tenantId, docNo: { startsWith: prefix } },
        orderBy: { docNo: 'desc' },
        select: { docNo: true },
      });
      break;
  }

  let next = 1;
  if (last?.docNo) {
    const parts = last.docNo.split('-');
    const tail = parts[parts.length - 1];
    const num = parseInt(tail, 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}
