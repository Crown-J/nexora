import type { Prisma } from 'db-core';

/** DN 單號：DN-YYYYMM-{倉碼}-00001 */
export async function allocNx06DnDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  warehouseCode: string,
): Promise<string> {
  const y = new Date();
  const yyyymm = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `DN-${yyyymm}-${warehouseCode}-`;
  const last = await tx.nx06Dn.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  let next = 1;
  if (last?.docNo) {
    const tail = last.docNo.split('-').pop();
    const num = parseInt(tail || '', 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}
