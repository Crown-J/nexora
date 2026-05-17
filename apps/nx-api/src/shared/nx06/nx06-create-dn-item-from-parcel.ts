// apps/nx-api/src/shared/nx06/nx06-create-dn-item-from-parcel.ts
// 從 NX03 包裹（Parcel）建立 NX06 DnItem（pure export helper、本軌不 wire 入 production）
//
// 對齊：
//   - TASK-NX06-IMPL-01 Phase 4 L4 跨模組 wire（NX03 Parcel → NX06 DnItem 範式預留）
//   - overview §6.3 包裹追蹤（後續軌 NX03-NX06 包貨配送整合）
//   - Crown Q9=a 倉管打包後產出 parcel、配送時可寫 DnItem.parcelId 串接
//
// 業務語意（pure export，不 wire）：
//   - NX03 Parcel 寫好後（含 partItems 明細）、若需配送到客戶 → 倉管組長將 parcel 加入既有 DN 的 stop
//   - 本 helper 將 parcel 內每筆 part 寫成 DnItem（parcelId 鍵入、line by line）
//   - 冪等：同 dnId + parcelId 已存 dn_item → return existing ids
//
// 邊界：
//   - 本軌不 wire（NX03 outbound/parcel 既有流程未進入 DN 配送點）
//   - 後續軌：NX03 parcel completed + 配送類型=D → 自動或半自動 attach 到 DN
//   - 寫入時假設 parcel.dnId 反向關聯後續軌補（schema 已預留 nx06_dn_item.parcelId）

import type { Prisma } from 'db-core';

export async function createDnItemsFromParcel(
  tx: Prisma.TransactionClient,
  p: {
    tenantId: string;
    dnId: string;
    stopId: string;
    parcelId: string;
    userId: string;
  },
): Promise<string[]> {
  // 冪等：同 dnId + parcelId 已寫過 → return existing item ids
  const dup = await tx.nx06DnItem.findMany({
    where: { dnId: p.dnId, parcelId: p.parcelId },
    select: { id: true },
  });
  if (dup.length) return dup.map((d) => d.id);

  // load parcel + items (Parcel 透過 Nx03PlItem.parcelId 取得明細，無獨立 ParcelItem 表)
  const parcel = await tx.nx03Parcel.findFirst({
    where: { id: p.parcelId, tenantId: p.tenantId },
    select: {
      id: true,
      rev_Nx03PlItem_parcelId: {
        orderBy: { lineNo: 'asc' },
        select: {
          id: true,
          lineNo: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
        },
      },
    },
  });
  if (!parcel) return [];

  // 取目前 dn 最後 lineNo（接續寫入）
  const last = await tx.nx06DnItem.findFirst({
    where: { dnId: p.dnId },
    orderBy: { lineNo: 'desc' },
    select: { lineNo: true },
  });
  let lineNo = (last?.lineNo ?? 0) + 1;

  const created: string[] = [];
  for (const pi of parcel.rev_Nx03PlItem_parcelId) {
    const newItem = await tx.nx06DnItem.create({
      data: {
        dnId: p.dnId,
        stopId: p.stopId,
        lineNo: lineNo++,
        sourceDocType: 'ST',
        sourceDocId: parcel.id,
        sourceItemId: pi.id,
        parcelId: parcel.id,
        partId: pi.partId,
        partNo: pi.partNo,
        partName: pi.partName,
        qty: pi.qty,
        deliveryStatus: 'P',
        updatedBy: p.userId,
      },
      select: { id: true },
    });
    created.push(newItem.id);
  }
  return created;
}
