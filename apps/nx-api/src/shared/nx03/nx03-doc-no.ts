// apps/nx-api/src/shared/nx03/nx03-doc-no.ts
import type { Prisma } from 'db-core';

export type Nx03DocKind = 'IB' | 'OB' | 'SL' | 'ST' | 'IN' | 'DS' | 'PK' | 'PL' | 'CV' | 'IR';

/**
 * NX03 單號：[類型]-[YYYYMM]-[倉庫碼]-[5 碼流水]
 *   IB=Inbound / OB=Outbound / SL=StockTake / ST=Transfer / IN=Init / DS=Disposal /
 *   PK=Pick (撿貨單) / PL=Pack (包貨單) / CV=Conversion (重組 M / 分解 D) /
 *   IR=IssueReport (異常回報、NX03-STOCK-LITE M2-C)
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

  let last: { docNo: string } | null = null;
  if (kind === 'IB') {
    last = await tx.nx03Inbound.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
  } else if (kind === 'OB') {
    last = await tx.nx03Outbound.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
  } else if (kind === 'SL') {
    last = await tx.nx03StockTake.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
  } else if (kind === 'ST') {
    last = await tx.nx03St.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
  } else if (kind === 'IN') {
    last = await tx.nx03Init.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
  } else if (kind === 'DS') {
    last = await tx.nx03Disposal.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
  } else if (kind === 'PK') {
    last = await tx.nx03Pk.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
  } else if (kind === 'PL') {
    last = await tx.nx03Pl.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
  } else if (kind === 'CV') {
    last = await tx.nx03Conversion.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
  } else if (kind === 'IR') {
    last = await tx.nx03IssueReport.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
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
