import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { PaylogStatus } from './nx05-state-machine';

/** 客戶收款 CR 過帳：扣 AR 餘額；nx05_paylog 即 AR 核銷流水（規格 nx05_ar_txn 語意）。 */
export async function applyCrReceiptPosted(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; paylogId: string; userId: string },
): Promise<void> {
  const log = await tx.nx05Paylog.findFirst({
    where: { id: p.paylogId, tenantId: p.tenantId, payType: 'CR' },
    select: { id: true, status: true, amount: true, arId: true },
  });
  if (!log) throw new BadRequestException('Receipt not found');
  if (log.status !== PaylogStatus.DRAFT) throw new BadRequestException('Receipt is not DRAFT');
  if (!log.arId) throw new BadRequestException('Receipt must reference arId');

  const ar = await tx.nx05ArLedger.findFirst({
    where: { id: log.arId, tenantId: p.tenantId },
    select: { paidAmount: true, originalAmount: true, balanceAmount: true, status: true },
  });
  if (!ar) throw new BadRequestException('AR not found');
  if (ar.status === 'WRITTEN_OFF' || ar.status === 'PAID') throw new BadRequestException('AR cannot accept receipt in current status');

  const amt = new PrismaNs.Decimal(log.amount);
  const newPaid = new PrismaNs.Decimal(ar.paidAmount).add(amt);
  const orig = new PrismaNs.Decimal(ar.originalAmount);
  const newBal = orig.sub(newPaid);
  if (newBal.lt(0)) throw new BadRequestException('Receipt amount exceeds AR balance');

  let nextStatus = ar.status;
  if (newBal.eq(0)) {
    nextStatus = 'PAID';
  } else if (newPaid.gt(0)) {
    nextStatus = 'PARTIAL';
  }

  await tx.nx05ArLedger.update({
    where: { id: log.arId },
    data: {
      paidAmount: newPaid,
      balanceAmount: newBal,
      status: nextStatus,
      updatedBy: p.userId,
    },
  });
  await tx.nx05Paylog.update({
    where: { id: p.paylogId },
    data: { status: PaylogStatus.POSTED, postedAt: new Date(), updatedBy: p.userId },
  });
}

/** 廠商付款 CP 過帳：扣 AP 餘額。 */
export async function applyCpPaymentPosted(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; paylogId: string; userId: string },
): Promise<void> {
  const log = await tx.nx05Paylog.findFirst({
    where: { id: p.paylogId, tenantId: p.tenantId, payType: 'CP' },
    select: { id: true, status: true, amount: true, apId: true },
  });
  if (!log) throw new BadRequestException('Payment not found');
  if (log.status !== PaylogStatus.DRAFT) throw new BadRequestException('Payment is not DRAFT');
  if (!log.apId) throw new BadRequestException('Payment must reference apId');

  const ap = await tx.nx05ApLedger.findFirst({
    where: { id: log.apId, tenantId: p.tenantId },
    select: { paidAmount: true, originalAmount: true, balanceAmount: true, status: true },
  });
  if (!ap) throw new BadRequestException('AP not found');
  if (ap.status === 'VOID' || ap.status === 'PAID') throw new BadRequestException('AP cannot accept payment in current status');

  const amt = new PrismaNs.Decimal(log.amount);
  const newPaid = new PrismaNs.Decimal(ap.paidAmount).add(amt);
  const orig = new PrismaNs.Decimal(ap.originalAmount);
  const newBal = orig.sub(newPaid);
  if (newBal.lt(0)) throw new BadRequestException('Payment amount exceeds AP balance');

  let nextStatus = ap.status;
  if (newBal.eq(0)) nextStatus = 'PAID';
  else if (newPaid.gt(0)) nextStatus = 'PARTIAL';

  await tx.nx05ApLedger.update({
    where: { id: log.apId },
    data: {
      paidAmount: newPaid,
      balanceAmount: newBal,
      status: nextStatus,
      updatedBy: p.userId,
    },
  });
  await tx.nx05Paylog.update({
    where: { id: p.paylogId },
    data: { status: PaylogStatus.POSTED, postedAt: new Date(), updatedBy: p.userId },
  });
}

/** 沖回已過帳客戶收款。 */
export async function reverseCrReceiptPosted(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; paylogId: string; userId: string },
): Promise<void> {
  const log = await tx.nx05Paylog.findFirst({
    where: { id: p.paylogId, tenantId: p.tenantId, payType: 'CR' },
    select: { id: true, status: true, amount: true, arId: true },
  });
  if (!log) throw new BadRequestException('Receipt not found');
  if (log.status !== PaylogStatus.POSTED) throw new BadRequestException('Receipt is not POSTED');
  if (!log.arId) throw new BadRequestException('Receipt must reference arId');

  const ar = await tx.nx05ArLedger.findFirst({
    where: { id: log.arId, tenantId: p.tenantId },
    select: { paidAmount: true, originalAmount: true, status: true },
  });
  if (!ar) throw new BadRequestException('AR not found');
  if (ar.status === 'WRITTEN_OFF') throw new BadRequestException('Cannot void receipt against written-off AR');

  const amt = new PrismaNs.Decimal(log.amount);
  const newPaid = new PrismaNs.Decimal(ar.paidAmount).sub(amt);
  if (newPaid.lt(0)) throw new BadRequestException('Receipt reversal would make AR paidAmount negative');
  const orig = new PrismaNs.Decimal(ar.originalAmount);
  const newBal = orig.sub(newPaid);

  let nextStatus = ar.status;
  if (newPaid.eq(0)) nextStatus = 'OPEN';
  else if (newBal.gt(0)) nextStatus = 'PARTIAL';

  await tx.nx05ArLedger.update({
    where: { id: log.arId },
    data: {
      paidAmount: newPaid,
      balanceAmount: newBal,
      status: nextStatus,
      updatedBy: p.userId,
    },
  });
  await tx.nx05Paylog.update({
    where: { id: p.paylogId },
    data: { status: PaylogStatus.VOIDED, voidedAt: new Date(), updatedBy: p.userId },
  });
}

/** 沖回已過帳廠商付款。 */
export async function reverseCpPaymentPosted(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; paylogId: string; userId: string },
): Promise<void> {
  const log = await tx.nx05Paylog.findFirst({
    where: { id: p.paylogId, tenantId: p.tenantId, payType: 'CP' },
    select: { id: true, status: true, amount: true, apId: true },
  });
  if (!log) throw new BadRequestException('Payment not found');
  if (log.status !== PaylogStatus.POSTED) throw new BadRequestException('Payment is not POSTED');
  if (!log.apId) throw new BadRequestException('Payment must reference apId');

  const ap = await tx.nx05ApLedger.findFirst({
    where: { id: log.apId, tenantId: p.tenantId },
    select: { paidAmount: true, originalAmount: true, status: true },
  });
  if (!ap) throw new BadRequestException('AP not found');
  if (ap.status === 'VOID') throw new BadRequestException('Cannot void payment against void AP');

  const amt = new PrismaNs.Decimal(log.amount);
  const newPaid = new PrismaNs.Decimal(ap.paidAmount).sub(amt);
  if (newPaid.lt(0)) throw new BadRequestException('Payment reversal would make AP paidAmount negative');
  const orig = new PrismaNs.Decimal(ap.originalAmount);
  const newBal = orig.sub(newPaid);

  let nextStatus = ap.status;
  if (newPaid.eq(0)) nextStatus = 'OPEN';
  else if (newBal.gt(0)) nextStatus = 'PARTIAL';

  await tx.nx05ApLedger.update({
    where: { id: log.apId },
    data: {
      paidAmount: newPaid,
      balanceAmount: newBal,
      status: nextStatus,
      updatedBy: p.userId,
    },
  });
  await tx.nx05Paylog.update({
    where: { id: p.paylogId },
    data: { status: PaylogStatus.VOIDED, voidedAt: new Date(), updatedBy: p.userId },
  });
}
