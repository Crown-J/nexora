// apps/nx-api/src/shared/nx03/nx03-on-st-received.ts
// PICK-CHAIN 2026-07-18：ST RECEIVED（自倉調撥收貨過帳）→ SO line 補貨完成 + task-pool 通知
//
// 業務語意（對齊 nx04-on-ti-posted 同行調貨範式；W6-T2 自倉調撥鏈最後一哩）：
//   - ST status 推進到 RECEIVED 時、找該 StItem.sourceSoItemId 對應的 SO line
//   - SO line transferStatus 推進 'I' → 'C'（補貨完成、可進撿貨/出貨）
//   - 寫 nx98 task-pool 通知 SO 建單人：「SO {soNo} 調撥料已到、可進撿貨/出貨」
//
// 缺口背景：TI（同行調貨）三單自動回寫鏈 v2.7.0 已做；ST（自倉調撥）一直沒有對等機制、
//   等調撥的銷貨行貨到了仍卡「補貨中 I」永遠進不了撿貨佇列。全鏈路測試 2026-07-18 抓到。

import type { Prisma } from 'db-core';

export type ApplyStReceivedToSoParams = {
  tenantId: string;
  stId: string;
  stDocNo: string;
  userId: string;
};

/**
 * 給 NX03 transfer RECEIVED 過帳時呼叫（同 tx、由 caller 控制範圍）。
 * StItem.sourceSoItemId 為空（純倉間調撥、非 SO 缺貨觸發）→ 無事發生。
 */
export async function applyStReceivedToSo(
  tx: Prisma.TransactionClient,
  p: ApplyStReceivedToSoParams,
): Promise<void> {
  const stItems = await tx.nx03StItem.findMany({
    where: { stId: p.stId },
    select: { sourceSoItemId: true },
  });
  const soItemIds = Array.from(new Set(stItems.map((t) => t.sourceSoItemId).filter((x): x is string => !!x)));
  if (!soItemIds.length) return;

  // 找對應 SO line（過濾本租戶、避免跨租戶 leak）
  const soItems = await tx.nx04SoItem.findMany({
    where: {
      id: { in: soItemIds },
      so: { tenantId: p.tenantId },
    },
    select: {
      id: true,
      soId: true,
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
      data: { transferStatus: 'C', updatedBy: p.userId },
    });
    affectedSoIds.add(it.soId);
    if (!soInfoCache.has(it.soId)) {
      soInfoCache.set(it.soId, { docNo: it.so.docNo, createdBy: it.so.createdBy });
    }
  }

  // 對每張被影響的 SO 寫 task-pool 通知（同 TI 鏈的 SALES_SHIP_READY 類別）
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
        title: `SO ${info.docNo} 自倉調撥料已到、可進撿貨/出貨`,
        description: `調撥單 ${p.stDocNo} 收貨過帳完成、SO 對應行 transferStatus 已推進 C 補貨完成`,
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
