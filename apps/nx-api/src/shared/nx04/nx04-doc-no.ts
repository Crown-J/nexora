import type { Prisma } from 'db-core';

export type Nx04DocKind = 'QT' | 'SO' | 'SR';

export async function allocNx04DocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  kind: Nx04DocKind,
  warehouseCode: string,
): Promise<string> {
  const y = new Date();
  const yyyymm = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `${kind}-${yyyymm}-${warehouseCode}-`;

  const last =
    kind === 'QT'
      ? await tx.nx04Quote.findFirst({
          where: { tenantId, docNo: { startsWith: prefix } },
          orderBy: { docNo: 'desc' },
          select: { docNo: true },
        })
      : kind === 'SO'
        ? await tx.nx04So.findFirst({
            where: { tenantId, docNo: { startsWith: prefix } },
            orderBy: { docNo: 'desc' },
            select: { docNo: true },
          })
        : await tx.nx04Sr.findFirst({
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
