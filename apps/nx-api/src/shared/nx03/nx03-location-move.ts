// apps/nx-api/src/shared/nx03/nx03-location-move.ts
// WMS 庫位級庫存 P2（2026-07-23）：倉內庫位間搬移（原儲位 ↔ 待包暫存 ↔ 待上架）。
//
// 純「庫位餘額重分佈」：from -qty、to +qty，同一倉庫、倉庫 onHand 不變、不寫 stock_ledger。
//   （出貨真的扣倉庫走 applyQtyOutWithLedger；此檔只搬實體在哪格。）
// 保持恆等式 Σ(庫位)=倉庫：from/to 各 ±qty 抵銷。to 缺列則建、from 容許變負（對帳訊號、不擋流程）。

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

/** 系統庫位類型（對齊 nx01_location.location_type）。 */
export const SystemBinType = {
  STORAGE: 'S',
  RECEIVING: 'R',
  PACK_STAGING: 'K', // 待包暫存（撿貨頁「中欄」）
  PUTBACK_PENDING: 'B', // 待上架（撿貨頁「右欄」）
  UNASSIGNED: 'U',
} as const;

/** 取某倉某系統類型的庫位 id（每倉每型至少一格、P0 backfill 已建）。 */
export async function resolveSystemBin(
  tx: Prisma.TransactionClient,
  tenantId: string,
  warehouseId: string,
  type: string,
): Promise<string | null> {
  const loc = await tx.nx01Location.findFirst({
    where: { tenantId, warehouseId, locationType: type, isActive: true },
    orderBy: { sortNo: 'asc' },
    select: { id: true },
  });
  return loc?.id ?? null;
}

/** 取某料在某倉的儲位（原庫位）：料件預設庫位；無則退該倉「U 未指定」格。 */
export async function resolveStorageBin(
  tx: Prisma.TransactionClient,
  tenantId: string,
  partId: string,
  warehouseId: string,
): Promise<string | null> {
  const s = await tx.nx03PartStockSetting.findFirst({
    where: { tenantId, partId, warehouseId },
    select: { defaultLocationId: true },
  });
  if (s?.defaultLocationId) {
    const ok = await tx.nx01Location.findFirst({
      where: { id: s.defaultLocationId, warehouseId, isActive: true },
      select: { id: true },
    });
    if (ok) return ok.id;
  }
  return resolveSystemBin(tx, tenantId, warehouseId, SystemBinType.UNASSIGNED);
}

/**
 * 庫位間搬移：from -qty、to +qty（同倉、倉庫餘額不變）。
 * from/to 任一為 null 或相同則跳過該側；qty<=0 no-op。冪等由呼叫端動作後重抓保證。
 */
export async function moveLocationBalance(
  tx: Prisma.TransactionClient,
  p: {
    tenantId: string;
    partId: string;
    warehouseId: string;
    fromLocationId: string | null;
    toLocationId: string | null;
    qty: number;
    userId: string;
  },
): Promise<void> {
  if (p.qty <= 0) return;
  if (p.fromLocationId && p.toLocationId && p.fromLocationId === p.toLocationId) return;
  const now = new Date();
  const delta = new PrismaNs.Decimal(p.qty);
  const upsert = (locationId: string, d: PrismaNs.Decimal) =>
    tx.nx03StockLocationBalance.upsert({
      where: {
        tenantId_partId_warehouseId_locationId: {
          tenantId: p.tenantId,
          partId: p.partId,
          warehouseId: p.warehouseId,
          locationId,
        },
      },
      create: {
        tenantId: p.tenantId,
        partId: p.partId,
        warehouseId: p.warehouseId,
        locationId,
        onHandQty: d,
        lastMoveAt: now,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
      update: { onHandQty: { increment: d }, lastMoveAt: now, updatedBy: p.userId },
    });
  if (p.fromLocationId) await upsert(p.fromLocationId, delta.neg());
  if (p.toLocationId) await upsert(p.toLocationId, delta);
}
