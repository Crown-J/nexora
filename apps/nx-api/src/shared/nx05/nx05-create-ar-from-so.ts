import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx05DocNo, orgCodeFromDocNo } from './nx05-doc-no';

function addNetDays(base: Date, paymentTerm: string): Date {
  const m = paymentTerm.match(/NET(\d+)/i);
  const days = m ? parseInt(m[1]!, 10) : 30;
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** SO 出貨（SHIPPED）後建立應收（冪等）。回傳 AR id 或既有 id。 */
export async function createArFromShippedSo(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soId: string; userId: string },
): Promise<string | null> {
  const dup = await tx.nx05ArLedger.findFirst({
    where: { tenantId: p.tenantId, soId: p.soId },
    select: { id: true },
  });
  if (dup) return dup.id;

  const so = await tx.nx04So.findFirst({
    where: { id: p.soId, tenantId: p.tenantId, cancelledAt: null },
    select: {
      docNo: true,
      soDate: true,
      customerId: true,
      currencyId: true,
      paymentTerm: true,
      totalAmount: true,
    },
  });
  if (!so) return null;

  const org = orgCodeFromDocNo(so.docNo);
  const docNo = await allocNx05DocNo(tx, p.tenantId, 'AR', org);
  const total = new PrismaNs.Decimal(so.totalAmount);
  const arDate = new Date(so.soDate);
  const dueDate = addNetDays(arDate, so.paymentTerm || 'NET30');
  const row = await tx.nx05ArLedger.create({
    data: {
      tenantId: p.tenantId,
      docNo,
      soId: p.soId,
      customerId: so.customerId,
      arDate,
      dueDate,
      currencyId: so.currencyId,
      originalAmount: total,
      paidAmount: new PrismaNs.Decimal(0),
      balanceAmount: total,
      status: 'OPEN',
      paymentTerm: so.paymentTerm || 'NET30',
      createdBy: p.userId,
      updatedBy: p.userId,
    },
    select: { id: true },
  });
  return row.id;
}
