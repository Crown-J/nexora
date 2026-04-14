import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx06DnDocNo } from './nx06-doc-no';
import { LogisticsKind } from './nx06-state-machine';

/** 銷貨配送出貨（SO SHIPPED + deliveryType=D）後自動建立送貨草稿（冪等）。 */
export async function createDeliveryDnFromShippedSo(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soId: string; userId: string },
): Promise<string | null> {
  const dup = await tx.nx06Dn.findFirst({
    where: { tenantId: p.tenantId, sourceSoId: p.soId, logisticsType: LogisticsKind.DELIVERY },
    select: { id: true },
  });
  if (dup) return dup.id;

  const so = await tx.nx04So.findFirst({
    where: { id: p.soId, tenantId: p.tenantId, cancelledAt: null },
    select: {
      warehouseId: true,
      soDate: true,
      customerId: true,
      deliveryType: true,
      deliveryAddress: true,
      status: true,
    },
  });
  if (!so || so.deliveryType !== 'D' || so.status !== 'SHIPPED') return null;
  const addr = so.deliveryAddress?.trim();
  if (!addr) return null;

  const cust = await tx.nx01Partner.findFirst({
    where: { id: so.customerId, tenantId: p.tenantId },
    select: { contactName: true, phone: true, mobile: true },
  });
  const wh = await tx.nx01Warehouse.findFirst({
    where: { id: so.warehouseId, tenantId: p.tenantId },
    select: { code: true },
  });
  if (!wh) return null;

  const items = await tx.nx04SoItem.findMany({
    where: { soId: p.soId },
    orderBy: { lineNo: 'asc' },
    select: {
      id: true,
      lineNo: true,
      partId: true,
      partNo: true,
      partName: true,
      qty: true,
    },
  });
  if (!items.length) return null;

  const docNo = await allocNx06DnDocNo(tx, p.tenantId, wh.code);
  const dn = await tx.nx06Dn.create({
    data: {
      tenantId: p.tenantId,
      warehouseId: so.warehouseId,
      docNo,
      dnDate: new Date(so.soDate),
      driverUserId: p.userId,
      logisticsType: LogisticsKind.DELIVERY,
      status: 'DRAFT',
      sourceSoId: p.soId,
      remark: null,
      createdBy: p.userId,
      updatedBy: p.userId,
    },
    select: { id: true },
  });

  const stop = await tx.nx06DnStop.create({
    data: {
      dnId: dn.id,
      stopNo: 1,
      taskType: 'D',
      partnerId: so.customerId,
      address: addr,
      contactName: cust?.contactName ?? null,
      contactPhone: cust?.phone ?? cust?.mobile ?? null,
      status: 'P',
      updatedBy: p.userId,
    },
    select: { id: true },
  });

  for (const it of items) {
    const qty = new PrismaNs.Decimal(String(it.qty));
    if (!qty.gt(0)) continue;
    await tx.nx06DnItem.create({
      data: {
        dnId: dn.id,
        stopId: stop.id,
        lineNo: it.lineNo,
        sourceDocType: 'SO',
        sourceDocId: p.soId,
        sourceItemId: it.id,
        partId: it.partId,
        partNo: it.partNo,
        partName: it.partName,
        qty,
        deliveryStatus: 'P',
        updatedBy: p.userId,
      },
    });
  }

  return dn.id;
}
