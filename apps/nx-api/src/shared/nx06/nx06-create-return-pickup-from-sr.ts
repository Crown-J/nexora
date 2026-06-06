// apps/nx-api/src/shared/nx06/nx06-create-return-pickup-from-sr.ts
// 從 POSTED + returnAction=R/D 的銷退單自動建立 NX06 RETURN_PICKUP DN 草稿（冪等）
//
// 對齊：
//   - TASK-NX06-IMPL-01 Phase 4 L4 跨模組 wire（仿 nx06-create-delivery-from-so 範式）
//   - overview §3.1 #4 銷退取件（Crown Q5=b 半自動：sales-return.service POSTED 時自動建 RETURN_PICKUP 草稿）
//   - returnAction='X' 換新：不走此 helper（貨未實際回到我方倉、業務員手動換新 SO）
//
// 業務語意：
//   - sales-return.service POSTED + R/D → 自動建 RETURN_PICKUP DN（status=DRAFT、driverUserId=操作員）
//   - 倉管組長後續手動 PATCH driverUserId / dispatch（既有 dn-logistics.service.patchDn 路徑）
//   - 冪等：tenant + sourceSrId + logisticsType=R 唯一性、重複呼叫直接 return existing dnId
//
// 邊界：
//   - 不動 sales-return 既有 applySrPosting / createAllowanceFromSalesReturn 路徑（pure additive）
//   - 失敗（找不到 SR / 沒地址 / 沒 items）→ return null（不 throw，避免 SR POSTED 流程中斷）

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx06DnDocNo } from './nx06-doc-no';
import { LogisticsKind } from './nx06-state-machine';

export async function createReturnPickupFromPostedSr(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; srId: string; userId: string },
): Promise<string | null> {
  // 冪等
  const dup = await tx.nx06Dn.findFirst({
    where: {
      tenantId: p.tenantId,
      sourceSrId: p.srId,
      logisticsType: LogisticsKind.RETURN_PICKUP,
    },
    select: { id: true },
  });
  if (dup) return dup.id;

  const sr = await tx.nx04Sr.findFirst({
    where: { id: p.srId, tenantId: p.tenantId },
    select: {
      id: true,
      srDate: true,
      warehouseId: true,
      customerId: true,
    },
  });
  if (!sr) return null;

  const cust = await tx.nx01Partner.findFirst({
    where: { id: sr.customerId, tenantId: p.tenantId },
    select: { contactName: true, phone: true, mobile: true },
  });
  // 02 對齊第二批 A 軌 CP2 2026-06-06：partner.address 已 DROP、tx 內手動組 partner_address SHIPPING 預設
  const shipping =
    (await tx.nx01PartnerAddress.findFirst({
      where: {
        tenantId: p.tenantId,
        partnerId: sr.customerId,
        addressType: 'SHIPPING',
        isActive: true,
        isDefault: true,
      },
      include: {
        city: { select: { name: true } },
        district: { select: { name: true } },
        country: { select: { code: true, name: true } },
      },
    })) ??
    (await tx.nx01PartnerAddress.findFirst({
      where: {
        tenantId: p.tenantId,
        partnerId: sr.customerId,
        addressType: 'SHIPPING',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        city: { select: { name: true } },
        district: { select: { name: true } },
        country: { select: { code: true, name: true } },
      },
    }));
  if (!shipping) return null;
  const isTW = !shipping.countryId || shipping.country?.code === 'TWN';
  const addr = !isTW && shipping.freeformAddress
    ? [shipping.country?.name, shipping.postalCode, shipping.freeformAddress].filter(Boolean).join(' ').trim()
    : [
        shipping.postalCode,
        shipping.city?.name,
        shipping.district?.name,
        shipping.streetName,
        shipping.lane ? `${shipping.lane}巷` : '',
        shipping.alley ? `${shipping.alley}弄` : '',
        shipping.buildingNo ? `${shipping.buildingNo}號${shipping.buildingSubNo ? '之' + shipping.buildingSubNo : ''}` : '',
        shipping.floor ? `${shipping.floor}樓` : '',
        shipping.roomNo ? `${shipping.roomNo}室` : '',
      ].filter(Boolean).join('').trim();
  if (!addr) return null;

  const wh = await tx.nx01Warehouse.findFirst({
    where: { id: sr.warehouseId, tenantId: p.tenantId },
    select: { id: true, code: true },
  });
  if (!wh) return null;

  const items = await tx.nx04SrItem.findMany({
    where: { srId: sr.id },
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
      warehouseId: wh.id,
      docNo,
      dnDate: new Date(sr.srDate),
      driverUserId: p.userId,
      logisticsType: LogisticsKind.RETURN_PICKUP,
      status: 'DRAFT',
      sourceSrId: sr.id,
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
      taskType: 'C',
      partnerId: sr.customerId,
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
        sourceDocType: 'SR',
        sourceDocId: sr.id,
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
