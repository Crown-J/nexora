import type { Prisma } from 'db-core';

export type Nx03DocKind = 'IB' | 'OB' | 'SL' | 'ST' | 'IN' | 'DS';

/**
 * NX03 單號：[類型]-[YYYYMM]-[倉庫碼]-[5 碼流水]
 *   IB=Inbound / OB=Outbound / SL=StockTake / ST=Transfer / IN=Init / DS=Disposal
 */
export async function allocNx03DocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  kind: Nx03DocKind,
  warehouseCode: string,
): Promise<string> {
  const y = new Date();
  const yyyymm = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `${kind}-${yyyymm}-${warehouseCode}-`;

  const last =
    kind === 'IB'
      ? await tx.nx03Inbound.findFirst({
          where: { tenantId, docNo: { startsWith: prefix } },
          orderBy: { docNo: 'desc' },
          select: { docNo: true },
        })
      : kind === 'OB'
        ? await tx.nx03Outbound.findFirst({
            where: { tenantId, docNo: { startsWith: prefix } },
            orderBy: { docNo: 'desc' },
            select: { docNo: true },
          })
        : kind === 'SL'
          ? await tx.nx03StockTake.findFirst({
              where: { tenantId, docNo: { startsWith: prefix } },
              orderBy: { docNo: 'desc' },
              select: { docNo: true },
            })
          : kind === 'ST'
            ? await tx.nx03St.findFirst({
                where: { tenantId, docNo: { startsWith: prefix } },
                orderBy: { docNo: 'desc' },
                select: { docNo: true },
              })
            : kind === 'IN'
              ? await tx.nx03Init.findFirst({
                  where: { tenantId, docNo: { startsWith: prefix } },
                  orderBy: { docNo: 'desc' },
                  select: { docNo: true },
                })
              : await tx.nx03Disposal.findFirst({
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
