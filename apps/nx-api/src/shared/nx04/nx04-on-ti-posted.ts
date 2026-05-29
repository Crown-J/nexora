// apps/nx-api/src/shared/nx04/nx04-on-ti-posted.ts
// NX04-M2 §A C3：TI POSTED（入庫完成）→ SO line 補貨完成 + task-pool 通知
//
// 業務語意（Crown 2026-05-29 §A C3 拍板）：
//   - TI status 推進到 'C'（已完成 / 入庫完成）時、找該 TiItem.sourceSoItemId 對應的 SO line
//   - SO line transferStatus 推進 'I' → 'C'（補貨完成、可進撿貨/出貨）
//   - 寫 nx98 task-pool 通知 SO 建單人 + 倉管組：「SO {soNo} 調貨料已到、可出貨」
//   - sourceModule='NX04' / sourceDocType='SO' / sourceDocId=so.id
//
// ⚠️ FU-sales-lite-10：本 helper 已落地、未串接 NX02 RR POSTED handler。
//    當 NX02 RR / TI status 流轉到 'C' 時、需在那邊呼叫此 helper、本軌不改 NX02。

import type { Prisma } from 'db-core';

export type ApplyTiPostedToSoParams = {
  tenantId: string;
  tiId: string;
  userId: string;
};

/**
 * 給 NX02 RR 完成入庫（TI status='C'）時呼叫
 * 本 transaction 內、由 caller 控制 tx 範圍
 */
export async function applyTiPostedToSo(
  tx: Prisma.TransactionClient,
  p: ApplyTiPostedToSoParams,
): Promise<void> {
  // 找該 TI 所有 TiItem.sourceSoItemId
  const tiItems = await tx.nx02TiItem.findMany({
    where: { tiId: p.tiId },
    select: { sourceSoItemId: true },
  });
  if (!tiItems.length) return;

  const soItemIds = Array.from(new Set(tiItems.map((t) => t.sourceSoItemId).filter(Boolean)));
  if (!soItemIds.length) return;

  // 找對應的 SO line（過濾本租戶、避免跨租戶 leak）
  const soItems = await tx.nx04SoItem.findMany({
    where: {
      id: { in: soItemIds },
      so: { tenantId: p.tenantId },
    },
    select: {
      id: true,
      soId: true,
      lineNo: true,
      partNo: true,
      transferStatus: true,
      so: { select: { id: true, docNo: true, createdBy: true } },
    },
  });

  // 推進 transferStatus（I/P → C）、忽略已是 C 的
  const affectedSoIds = new Set<string>();
  const soInfoCache = new Map<string, { docNo: string; createdBy: string }>();
  for (const it of soItems) {
    if (it.transferStatus === 'C') continue;
    await tx.nx04SoItem.update({
      where: { id: it.id },
      data: {
        transferStatus: 'C',
        updatedBy: p.userId,
      },
    });
    affectedSoIds.add(it.soId);
    if (!soInfoCache.has(it.soId)) {
      soInfoCache.set(it.soId, { docNo: it.so.docNo, createdBy: it.so.createdBy });
    }
  }

  // 對每張被影響的 SO、寫 task-pool 一筆「調貨料已到」通知
  for (const soId of affectedSoIds) {
    const info = soInfoCache.get(soId);
    if (!info) continue;
    await tx.nx98TaskPool.create({
      data: {
        tenantId: p.tenantId,
        sourceModule: 'NX04',
        sourceDocType: 'SO',
        sourceDocId: soId,
        sourceDocNo: info.docNo,
        title: `SO ${info.docNo} 同行調貨料已到、可進撿貨/出貨`,
        description: `TI ${p.tiId} 入庫完成、SO 對應行 transferStatus 已推進 C 補貨完成`,
        category: 'SALES_SHIP_READY',
        priority: 'M',
        assigneeUserId: info.createdBy,
        assignedAt: new Date(),
        assignedBy: p.userId,
        status: 'OPEN',
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });
  }
}
