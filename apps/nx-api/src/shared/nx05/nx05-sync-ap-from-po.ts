import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { createApFromConfirmedPo } from './nx05-create-ap-from-po';

const PO_SYNC_STATUSES = new Set(['CONFIRMED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CLOSED']);

/** PO 已確認後，同步 nx05_ap_ledger 金額（明細變更／稅率重算後呼叫）。 */
export async function syncApLedgerFromPo(
  db: Prisma.TransactionClient,
  p: { tenantId: string; poId: string; userId: string },
): Promise<void> {
  const po = await db.nx02Po.findFirst({
    where: { id: p.poId, tenantId: p.tenantId },
    select: { status: true, totalAmount: true, voidedAt: true },
  });
  if (!po || po.voidedAt || !PO_SYNC_STATUSES.has(po.status)) return;

  const total = new PrismaNs.Decimal(po.totalAmount);
  const ap = await db.nx05ApLedger.findFirst({
    where: { tenantId: p.tenantId, poId: p.poId },
    select: { id: true, paidAmount: true, status: true },
  });
  if (!ap) {
    await createApFromConfirmedPo(db, p);
    return;
  }
  if (ap.status === 'PAID' || ap.status === 'VOID') return;

  const paid = new PrismaNs.Decimal(ap.paidAmount);
  const newBal = total.sub(paid);
  if (newBal.lt(0)) {
    throw new BadRequestException('AP sync would make balance negative; void payments or adjust PO total.');
  }

  const nextStatus = paid.eq(0) ? 'OPEN' : newBal.eq(0) ? 'PAID' : 'PARTIAL';

  await db.nx05ApLedger.update({
    where: { id: ap.id },
    data: {
      originalAmount: total,
      balanceAmount: newBal,
      status: nextStatus,
      updatedBy: p.userId,
    },
  });
}
