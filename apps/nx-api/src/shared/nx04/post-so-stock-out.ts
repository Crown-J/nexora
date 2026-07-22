// apps/nx-api/src/shared/nx04/post-so-stock-out.ts
// SALES-FLOW 階段3（2026-07-22 執行長拍板 D4/D6）：銷貨出庫扣帳從「出庫 SHIPPED」搬到「簽收完成 COMPLETED」。
//
// 本 helper＝原 so.service.applySoShipping 抽出：把一張 SO 的每行扣庫存 + 寫 ledger。
// caller 控 tx；只在 SO 轉 COMPLETED 那次呼叫一次（冪等由 caller 狀態守門保證＝maybeCompleteAfterDelivery）。
// 語意與原 applySoShipping 完全一致（partId、預設庫位、part_version snapshot），只是搬了觸發時點。

import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { applyQtyOutWithLedger } from '../nx03/nx03-inventory';
import { requireDefaultLocationId } from './nx04-location';

/** 銷貨出庫扣帳（扣庫存 + 寫 ledger）。caller 控 tx、須保證只呼叫一次。 */
export async function postSoStockOut(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soId: string; userId: string },
): Promise<void> {
  const items = await tx.nx04SoItem.findMany({
    where: { soId: p.soId },
    select: { id: true, partId: true, warehouseId: true, locationId: true, qty: true },
  });
  if (!items.length) throw new BadRequestException('SO has no items to ship');
  for (const item of items) {
    const qtyOut = new PrismaNs.Decimal(String(item.qty));
    if (!qtyOut.gt(0)) continue;
    const locId =
      item.locationId?.trim() || (await requireDefaultLocationId(tx, p.tenantId, item.warehouseId));
    const partVersion = await tx.nx01PartVersion.findFirst({
      where: { tenantId: p.tenantId, partId: item.partId, effectiveTo: null },
      orderBy: { versionNo: 'desc' },
      select: { id: true },
    });
    await applyQtyOutWithLedger(tx, {
      tenantId: p.tenantId,
      userId: p.userId,
      partId: item.partId,
      warehouseId: item.warehouseId,
      locationId: locId,
      qtyOut,
      sourceModule: 'NX04',
      sourceDocType: 'S',
      sourceDocId: p.soId,
      sourceItemId: item.id,
      partVersionId: partVersion?.id ?? null,
    });
  }
}
