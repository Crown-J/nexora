// apps/nx-api/src/shared/nx02/nx02-demand-from-so.ts
// v1.2 階段 I P3：銷貨缺貨自動建採購需求（demandType='O' 客訂）
//
// 對齊：
//   - 階段 I 意圖書 §3 採購需求 3 來源、Alex Q2=a 拍板（SO DRAFT 即時建 + cancel 自動忽略）
//   - 範式鏡像 nx03/auto-replenish/ar-suggestion-writer（demandType='S' AR 自動建）
//   - schema：Nx02Demand 既有 demandType='O' 路徑、customerId 帶 SO 客戶
//
// 業務語意：
//   - SO DRAFT 建立時、對每個 SoItem 檢查目標倉 available（onHand - reserved）
//   - 不足 → 建 demand(demandType='O', qty=shortage, customerId=so.customerId)
//   - SO CANCELLED → 對應 demand 批次 status='I' 已忽略
//
// 追溯機制：
//   - schema 無 sourceSoId 欄（避免再 STOP）、用 remark prefix '[SO:docNo/IT:itemId]' 紀錄
//   - 冪等：依 remark prefix 去重（同 SoItem 重跑不重複建）
//   - 範式對齊 nx03 auto-replenish writer（同樣用 remark 紀錄 batchId）

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

/** 結構化 remark prefix，便於 LIKE 查詢追溯來源。 */
function buildSoDemandRemark(soDocNo: string, soItemId: string): string {
  return `[SO:${soDocNo}/IT:${soItemId}] 銷貨缺貨自動建立`;
}

function remarkPrefix(soItemId: string): string {
  return `[SO:%/IT:${soItemId}]%`;
}

async function allocDemandDocNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<string> {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `DR-${yyyymm}-`;
  const last = await tx.nx02Demand.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  let next = 1;
  if (last?.docNo) {
    const tail = last.docNo.split('-').pop();
    const n = parseInt(tail ?? '', 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export interface CreateDemandFromSoResult {
  createdIds: string[];
  skippedIds: string[];
  noShortageCount: number;
}

/**
 * SO DRAFT 建立後：對每個 SoItem 查目標倉缺貨量、不足則建 demand(demandType='O')。
 * 在 prisma transaction 內呼叫（caller: SoService.create）。
 * 冪等：以 remark prefix '[SO:.../IT:itemId]' 去重、同 SoItem 重跑不重複。
 */
export async function createDemandsFromSoShortage(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soId: string; userId: string; expectedDate?: Date | null },
): Promise<CreateDemandFromSoResult> {
  const result: CreateDemandFromSoResult = {
    createdIds: [],
    skippedIds: [],
    noShortageCount: 0,
  };

  const so = await tx.nx04So.findFirst({
    where: { id: p.soId, tenantId: p.tenantId },
    select: {
      id: true,
      docNo: true,
      customerId: true,
      rev_Nx04SoItem_soId: {
        select: {
          id: true,
          partId: true,
          warehouseId: true,
          qty: true,
        },
      },
    },
  });
  if (!so) return result;

  for (const item of so.rev_Nx04SoItem_soId) {
    // 冪等查詢：此 SoItem 是否已有對應 demand
    const dup = await tx.nx02Demand.findFirst({
      where: {
        tenantId: p.tenantId,
        remark: { contains: `/IT:${item.id}]` },
      },
      select: { id: true },
    });
    if (dup) {
      result.skippedIds.push(dup.id);
      continue;
    }

    // 查目標倉 available
    const balance = await tx.nx03StockBalance.findFirst({
      where: { tenantId: p.tenantId, partId: item.partId, warehouseId: item.warehouseId },
      select: { onHandQty: true, reservedQty: true },
    });
    const onHand = balance
      ? new PrismaNs.Decimal(balance.onHandQty).sub(new PrismaNs.Decimal(balance.reservedQty))
      : new PrismaNs.Decimal(0);
    const required = new PrismaNs.Decimal(item.qty);
    const shortage = required.sub(onHand);

    if (shortage.lte(0)) {
      result.noShortageCount++;
      continue;
    }

    const docNo = await allocDemandDocNo(tx, p.tenantId);
    const created = await tx.nx02Demand.create({
      data: {
        tenantId: p.tenantId,
        docNo,
        demandType: 'O',
        partId: item.partId,
        warehouseId: item.warehouseId,
        qty: shortage,
        customerId: so.customerId,
        expectedDate: p.expectedDate ?? null,
        status: 'O',
        remark: buildSoDemandRemark(so.docNo, item.id),
        createdBy: p.userId,
        updatedBy: p.userId,
      },
      select: { id: true },
    });
    result.createdIds.push(created.id);
  }

  return result;
}

/**
 * SO CANCELLED 時：把該 SO 所有 items 對應的 demand 全部標 status='I' 已忽略。
 * 冪等：只動 status='O'/'P' 的 row（已完成 C / 已忽略 I 不再動）。
 */
export async function ignoreDemandsForCancelledSo(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soId: string; userId: string },
): Promise<{ ignoredCount: number; ignoredIds: string[] }> {
  const so = await tx.nx04So.findFirst({
    where: { id: p.soId, tenantId: p.tenantId },
    select: {
      rev_Nx04SoItem_soId: { select: { id: true } },
    },
  });
  if (!so) return { ignoredCount: 0, ignoredIds: [] };

  const itemIds = so.rev_Nx04SoItem_soId.map((it) => it.id);
  if (itemIds.length === 0) return { ignoredCount: 0, ignoredIds: [] };

  // 查所有對應 demand（按 remark prefix）
  const demands = await tx.nx02Demand.findMany({
    where: {
      tenantId: p.tenantId,
      status: { in: ['O', 'P'] },
      OR: itemIds.map((id) => ({ remark: { contains: `/IT:${id}]` } })),
    },
    select: { id: true },
  });
  if (demands.length === 0) return { ignoredCount: 0, ignoredIds: [] };

  const ids = demands.map((d) => d.id);
  await tx.nx02Demand.updateMany({
    where: { id: { in: ids } },
    data: {
      status: 'I',
      ignoreReason: 'SO 已取消、自動忽略此需求',
      updatedBy: p.userId,
    },
  });
  return { ignoredCount: ids.length, ignoredIds: ids };
}
