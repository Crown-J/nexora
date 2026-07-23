// apps/nx-api/src/shared/nx03/nx03-putback-on-cancel.ts
// 撿貨中被取消 → 待上架（WMS P2 2026-07-23 執行長拍板、規格 docs/_team/bin-level-stock-proposal.md）。
//
// 業務語意：撿貨清單某項所屬銷貨單被取消、且貨已撿下架（在待包暫存 K）——
//   · 撿貨清單本身已用 cancelledAt:null 過濾、取消單自動消失（自動移除已成立）。
//   · 已撿下架的貨要放回架上 → 實體搬 待包暫存 K → 待上架 B、掛在撿貨頁「右欄」等倉管按「已放回」。
// 本 helper：SO 取消時，若有已撿(C)未包的撿貨明細，
//   ① 實體搬 待包暫存 → 待上架（庫位重分佈、倉庫餘額不變）；
//   ② 作廢隱形撿貨單（剔出包貨台）、C 撿貨明細保留＝右欄「已取消」清單來源。
// 註：撿貨清單只含銷貨單（getPickList 只查 Nx04SoItem）、調撥不在撿貨池，故僅適用 SO。

import type { Prisma } from 'db-core';

import { moveLocationBalance, resolveSystemBin, SystemBinType } from './nx03-location-move';
import { PkStatus } from './nx03-state-machine';

interface PutbackResult {
  created: boolean;
  putbackLines: number;
  voidedPkIds: string[];
}

/**
 * SO 取消時、把「已撿未包」的貨搬到待上架 + 作廢隱形撿貨單。
 * 冪等：只挑未包(無 pl_item)的 C 撿貨明細；已包/已作廢的不動。無已撿貨則 no-op。
 */
export async function createPutbackOnSoCancel(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soId: string; soDocNo: string; userId: string },
): Promise<PutbackResult> {
  // 該 SO 已撿(C) 且未包(rev_Nx03PlItem_pkItemId 空) 的撿貨明細
  const items = await tx.nx03PkItem.findMany({
    where: {
      status: 'C',
      refSoId: p.soId,
      pk: { tenantId: p.tenantId, status: { not: PkStatus.VOIDED } },
      rev_Nx03PlItem_pkItemId: { none: {} }, // 未被包貨引用＝還在架下、沒進箱
    },
    select: { id: true, pkId: true, partId: true, qty: true, pk: { select: { warehouseId: true } } },
  });
  if (!items.length) return { created: false, putbackLines: 0, voidedPkIds: [] };

  // ① 實體搬 待包暫存 K → 待上架 B（依 料件×倉庫 彙總、倉庫餘額不變）
  const byPartWh = new Map<string, { partId: string; warehouseId: string; qty: number }>();
  for (const it of items) {
    const whId = it.pk.warehouseId;
    const key = `${it.partId}|${whId}`;
    const cur = byPartWh.get(key) ?? { partId: it.partId, warehouseId: whId, qty: 0 };
    cur.qty += Number(it.qty);
    byPartWh.set(key, cur);
  }
  for (const g of byPartWh.values()) {
    await moveLocationBalance(tx, {
      tenantId: p.tenantId,
      partId: g.partId,
      warehouseId: g.warehouseId,
      fromLocationId: await resolveSystemBin(tx, p.tenantId, g.warehouseId, SystemBinType.PACK_STAGING),
      toLocationId: await resolveSystemBin(tx, p.tenantId, g.warehouseId, SystemBinType.PUTBACK_PENDING),
      qty: g.qty,
      userId: p.userId,
    });
  }

  // ② 作廢隱形撿貨單（剔出包貨台）；C 撿貨明細保留＝右欄「已取消」清單來源
  const pkIds = [...new Set(items.map((i) => i.pkId))];
  const voidedPkIds: string[] = [];
  for (const pkId of pkIds) {
    const packed = await tx.nx03PlItem.count({ where: { pkItem: { pkId } } });
    if (packed > 0) continue; // 保險：有已包明細的不作廢（撿貨中取消不會發生）
    await tx.nx03Pk.update({
      where: { id: pkId },
      data: { status: PkStatus.VOIDED, updatedBy: p.userId },
    });
    voidedPkIds.push(pkId);
  }

  return { created: true, putbackLines: byPartWh.size, voidedPkIds };
}
