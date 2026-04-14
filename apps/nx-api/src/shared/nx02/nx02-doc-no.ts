import type { Prisma } from 'db-core';

export type DocKind = 'RF' | 'PO' | 'RR' | 'PR';

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

  const last =
    kind === 'RF'
      ? await tx.nx02Rfq.findFirst({
          where: { tenantId, docNo: { startsWith: prefix } },
          orderBy: { docNo: 'desc' },
          select: { docNo: true },
        })
      : kind === 'PO'
        ? await tx.nx02Po.findFirst({
            where: { tenantId, docNo: { startsWith: prefix } },
            orderBy: { docNo: 'desc' },
            select: { docNo: true },
          })
        : kind === 'RR'
          ? await tx.nx02Rr.findFirst({
              where: { tenantId, docNo: { startsWith: prefix } },
              orderBy: { docNo: 'desc' },
              select: { docNo: true },
            })
          : await tx.nx02Pr.findFirst({
              where: { tenantId, docNo: { startsWith: prefix } },
              orderBy: { docNo: 'desc' },
              select: { docNo: true },
            });

  let next = 1;
  if (last?.docNo) {
    const parts = last.docNo.split('-');
    const tail = parts[parts.length - 1];
    const num = parseInt(tail, 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}
