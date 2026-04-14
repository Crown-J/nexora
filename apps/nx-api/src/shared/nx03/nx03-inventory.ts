import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

export type QtyLedgerParams = {
  tenantId: string;
  userId: string;
  partId: string;
  warehouseId: string;
  locationId: string;
  sourceModule: string;
  sourceDocType: string;
  sourceDocId: string;
  sourceItemId: string | null;
};

/** 入庫／調撥入：更新 nx03_stock_balance 並寫 ledger（movement I）。 */
export async function applyQtyInWithLedger(
  tx: Prisma.TransactionClient,
  p: QtyLedgerParams & { qtyIn: PrismaNs.Decimal; unitCost: PrismaNs.Decimal },
): Promise<void> {
  const { qtyIn, unitCost } = p;
  if (qtyIn.lte(0)) return;

  const bid = await tx.nx03StockBalance.findFirst({
    where: { tenantId: p.tenantId, partId: p.partId, warehouseId: p.warehouseId },
  });
  const oldQ = bid ? new PrismaNs.Decimal(bid.onHandQty) : new PrismaNs.Decimal(0);
  const oldA = bid ? new PrismaNs.Decimal(bid.avgCost) : new PrismaNs.Decimal(0);
  const newQ = oldQ.add(qtyIn);
  const newAvg = newQ.gt(0) ? oldQ.mul(oldA).add(qtyIn.mul(unitCost)).div(newQ) : unitCost;
  const reserved = bid ? new PrismaNs.Decimal(bid.reservedQty) : new PrismaNs.Decimal(0);
  const inTransit = bid ? new PrismaNs.Decimal(bid.inTransitQty) : new PrismaNs.Decimal(0);
  const avail = newQ.sub(reserved);
  const stockValue = newQ.mul(newAvg).toDecimalPlaces(2);
  const now = new Date();

  await tx.nx03StockBalance.upsert({
    where: {
      tenantId_partId_warehouseId: { tenantId: p.tenantId, partId: p.partId, warehouseId: p.warehouseId },
    },
    create: {
      tenantId: p.tenantId,
      partId: p.partId,
      warehouseId: p.warehouseId,
      onHandQty: qtyIn,
      reservedQty: 0,
      availableQty: qtyIn,
      inTransitQty: 0,
      avgCost: newAvg,
      stockValue,
      lastInAt: now,
      lastMoveAt: now,
      isActive: true,
      createdBy: p.userId,
      updatedBy: p.userId,
    },
    update: {
      onHandQty: newQ,
      avgCost: newAvg,
      availableQty: avail,
      inTransitQty: inTransit,
      stockValue,
      lastInAt: now,
      lastMoveAt: now,
      updatedBy: p.userId,
    },
  });

  await tx.nx03StockLedger.create({
    data: {
      tenantId: p.tenantId,
      movementDate: now,
      partId: p.partId,
      warehouseId: p.warehouseId,
      locationId: p.locationId,
      movementType: 'I',
      qtyIn,
      qtyOut: new PrismaNs.Decimal(0),
      unitCost,
      totalCost: qtyIn.mul(unitCost).toDecimalPlaces(2),
      balanceQty: newQ,
      balanceCost: newAvg,
      sourceModule: p.sourceModule,
      sourceDocType: p.sourceDocType,
      sourceDocId: p.sourceDocId,
      sourceItemId: p.sourceItemId ?? undefined,
    },
  });
}

/** 出庫／調撥出：依移動平均扣帳並寫 ledger（movement O）。 */
export async function applyQtyOutWithLedger(
  tx: Prisma.TransactionClient,
  p: QtyLedgerParams & { qtyOut: PrismaNs.Decimal },
): Promise<void> {
  const { qtyOut } = p;
  if (qtyOut.lte(0)) return;

  const bid = await tx.nx03StockBalance.findFirst({
    where: { tenantId: p.tenantId, partId: p.partId, warehouseId: p.warehouseId },
  });
  if (!bid) throw new BadRequestException('Insufficient stock (no balance row)');
  const oldQ = new PrismaNs.Decimal(bid.onHandQty);
  if (oldQ.lt(qtyOut)) throw new BadRequestException('Insufficient on-hand qty for outbound');
  const avg = new PrismaNs.Decimal(bid.avgCost);
  const newQ = oldQ.sub(qtyOut);
  const reserved = new PrismaNs.Decimal(bid.reservedQty);
  const inTransit = new PrismaNs.Decimal(bid.inTransitQty);
  const avail = newQ.sub(reserved);
  const stockValue = newQ.mul(avg).toDecimalPlaces(2);
  const now = new Date();

  await tx.nx03StockBalance.update({
    where: { id: bid.id },
    data: {
      onHandQty: newQ,
      availableQty: avail,
      stockValue,
      lastOutAt: now,
      lastMoveAt: now,
      updatedBy: p.userId,
    },
  });

  await tx.nx03StockLedger.create({
    data: {
      tenantId: p.tenantId,
      movementDate: now,
      partId: p.partId,
      warehouseId: p.warehouseId,
      locationId: p.locationId,
      movementType: 'O',
      qtyIn: new PrismaNs.Decimal(0),
      qtyOut,
      unitCost: avg,
      totalCost: qtyOut.mul(avg).toDecimalPlaces(2),
      balanceQty: newQ,
      balanceCost: avg,
      sourceModule: p.sourceModule,
      sourceDocType: p.sourceDocType,
      sourceDocId: p.sourceDocId,
      sourceItemId: p.sourceItemId ?? undefined,
    },
  });
}
