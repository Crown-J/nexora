import type { Prisma } from 'db-core';

export type Nx05DocKind = 'AR' | 'AP' | 'RC' | 'CP' | 'EX' | 'NT' | 'AL' | 'CL';

/**
 * 單號：[類型]-[YYYYMM]-[機構碼]-[5 碼流水]
 */
export async function allocNx05DocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  kind: Nx05DocKind,
  orgCode: string,
): Promise<string> {
  const y = new Date();
  const yyyymm = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, '0')}`;
  /** 收付款單號一律 PY-（nx05_field_v1）；RC/CP/EX 僅區分 pay_type。 */
  const docPrefix = kind === 'RC' || kind === 'CP' || kind === 'EX' ? 'PY' : kind;
  const prefix = `${docPrefix}-${yyyymm}-${orgCode}-`;

  const last =
    kind === 'AR'
      ? await tx.nx05ArLedger.findFirst({
          where: { tenantId, docNo: { startsWith: prefix } },
          orderBy: { docNo: 'desc' },
          select: { docNo: true },
        })
      : kind === 'AP'
        ? await tx.nx05ApLedger.findFirst({
            where: { tenantId, docNo: { startsWith: prefix } },
            orderBy: { docNo: 'desc' },
            select: { docNo: true },
          })
        : kind === 'RC' || kind === 'CP' || kind === 'EX'
          ? await tx.nx05Paylog.findFirst({
              where: { tenantId, docNo: { startsWith: prefix } },
              orderBy: { docNo: 'desc' },
              select: { docNo: true },
            })
          : kind === 'NT'
            ? await tx.nx05Note.findFirst({
                where: { tenantId, docNo: { startsWith: prefix } },
                orderBy: { docNo: 'desc' },
                select: { docNo: true },
              })
            : kind === 'AL'
              ? await tx.nx05Allowance.findFirst({
                  where: { tenantId, docNo: { startsWith: prefix } },
                  orderBy: { docNo: 'desc' },
                  select: { docNo: true },
                })
              : await tx.nx05Closing.findFirst({
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

/** 從 SO/PO 單號擷取機構碼（第三段）。 */
export function orgCodeFromDocNo(docNo: string): string {
  const p = docNo.split('-');
  return p.length >= 3 ? p[2]! : 'HQ0';
}
