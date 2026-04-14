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

/** PO 確認後建立應付（冪等）。回傳 AP id 或既有 id。 */
export async function createApFromConfirmedPo(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; poId: string; userId: string },
): Promise<string | null> {
  const dup = await tx.nx05ApLedger.findFirst({
    where: { tenantId: p.tenantId, poId: p.poId },
    select: { id: true },
  });
  if (dup) return dup.id;

  const po = await tx.nx02Po.findFirst({
    where: { id: p.poId, tenantId: p.tenantId, voidedAt: null },
    select: {
      docNo: true,
      poDate: true,
      supplierId: true,
      currencyId: true,
      totalAmount: true,
    },
  });
  if (!po) return null;

  const sup = await tx.nx01Partner.findFirst({
    where: { id: po.supplierId, tenantId: p.tenantId },
    select: { paymentTermDomestic: true },
  });
  const paymentTerm = sup?.paymentTermDomestic ?? 'NET30';
  const org = orgCodeFromDocNo(po.docNo);
  const docNo = await allocNx05DocNo(tx, p.tenantId, 'AP', org);
  const total = new PrismaNs.Decimal(po.totalAmount);
  const apDate = new Date(po.poDate);
  const dueDate = addNetDays(apDate, paymentTerm);
  const row = await tx.nx05ApLedger.create({
    data: {
      tenantId: p.tenantId,
      docNo,
      sourceType: 'PO',
      poId: p.poId,
      supplierId: po.supplierId,
      apDate,
      dueDate,
      currencyId: po.currencyId,
      originalAmount: total,
      paidAmount: new PrismaNs.Decimal(0),
      balanceAmount: total,
      status: 'OPEN',
      paymentTerm,
      createdBy: p.userId,
      updatedBy: p.userId,
    },
    select: { id: true },
  });
  return row.id;
}
