// apps/nx-api/src/shared/nx03/nx03-fulfill-advance.ts
// PICK-CHAIN 2026-07-19：撿貨/包貨單流轉 → 推進 SO 行 fulfillStatus（W→PK→PL→D→F 補中段推手）
//
// 缺口背景（2026-07-18 撿貨鏈盤點）：fulfillStatus 全鏈只有 nx06 DN 簽收寫 'F'、
//   PK/PL 過帳皆不回寫 → 倉庫實際撿了包了、銷貨單看不到進度。本 helper 補 PK/PL/D 三段推手：
//   · PK P→C（撿貨啟動）  → 行 W→PK（撿貨中）
//   · PL P→C（包貨啟動）  → 行 PK→PL（包貨中）
//   · PL F→S（寄出）      → 行 PL→D（配送中；nx06 DN 簽收推 F 既有）
//
// 守則：只前進不後退（FULFILL_ORDER 序）、冪等（同值/更後值 skip）；
//   一行可能拆多張撿貨單 → 以事件先到先推進、重複事件無害。

import type { Prisma } from 'db-core';

/** fulfillStatus 前進序（對齊 so.service derivePickingStatus 的 FULFILL_ORDER） */
const ORDER: Record<string, number> = { W: 0, PK: 1, PL: 2, D: 3, F: 4 };

export type FulfillStage = 'PK' | 'PL' | 'D' | 'F';

/**
 * 把一批 SO 行的 fulfillStatus 推進到 to（只前進不後退）。
 * caller 控制 tx 範圍；soItemIds 空陣列無事發生。
 */
export async function advanceSoItemsFulfill(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soItemIds: string[]; to: FulfillStage; userId: string },
): Promise<number> {
  const ids = Array.from(new Set(p.soItemIds.filter(Boolean)));
  if (!ids.length) return 0;
  const rows = await tx.nx04SoItem.findMany({
    where: { id: { in: ids }, so: { tenantId: p.tenantId } },
    select: { id: true, fulfillStatus: true },
  });
  let advanced = 0;
  for (const r of rows) {
    if ((ORDER[r.fulfillStatus] ?? 0) >= ORDER[p.to]) continue; // 冪等、不後退
    await tx.nx04SoItem.update({
      where: { id: r.id },
      data: { fulfillStatus: p.to, updatedBy: p.userId },
    });
    advanced++;
  }
  return advanced;
}

/** PK 單 → 對應 SO 行 id（refSoItemId 直連；非 SO 觸發的撿貨列為 null 自動略過） */
export async function soItemIdsOfPk(tx: Prisma.TransactionClient, pkId: string): Promise<string[]> {
  const items = await tx.nx03PkItem.findMany({
    where: { pkId },
    select: { refSoItemId: true },
  });
  return items.map((i) => i.refSoItemId).filter((x): x is string => !!x);
}

/** PL 單 → 經 PkItem 反查對應 SO 行 id（PlItem.pkItemId → PkItem.refSoItemId） */
export async function soItemIdsOfPl(tx: Prisma.TransactionClient, plId: string): Promise<string[]> {
  const items = await tx.nx03PlItem.findMany({
    where: { plId },
    select: { pkItem: { select: { refSoItemId: true } } },
  });
  return items.map((i) => i.pkItem?.refSoItemId).filter((x): x is string => !!x);
}
