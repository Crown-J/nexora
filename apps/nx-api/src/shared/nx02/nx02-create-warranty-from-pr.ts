// apps/nx-api/src/shared/nx02/nx02-create-warranty-from-pr.ts
// v1.2 階段 I P2：退貨「走保固」自動建保固申請單（冪等）
//
// 對齊：
//   - 階段 I 意圖書 §2 退貨→保固連線（總經理拍板 A：自動產生）
//   - Alex Q1=a：source_pr_id + source_pr_item_id 追溯
//   - 範式鏡像 nx05-create-ar-from-pr.ts（單筆→單筆轉換）
//
// 業務語意：
//   - PR.dispositionFlag='W' 過帳時自動建保固申請單
//   - 每個 PR item 建一張保固單（不合併、單一 partId 單筆追蹤）
//   - claimType='SELF'（從採購端發起、不連 SO）
//   - status='D' DRAFT（業務員後續填問題描述送出）
//   - sourcePrId + sourcePrItemId 回填、追溯來源
//
// 冪等策略：依 (tenantId, sourcePrItemId) 找既有 row、有則跳過該 item

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocDocNo } from './nx02-doc-no';

export interface CreateWarrantyFromPrResult {
  /** 本次新建的保固單 ID 清單（依 PR item 順序） */
  createdIds: string[];
  /** 跳過（已有）的保固單 ID 清單 */
  skippedIds: string[];
}

/**
 * PR POSTED + dispositionFlag='W' → 對每個 PR item 自動建保固申請單（冪等）。
 * 在 prisma transaction 內呼叫（caller: PurchaseReturnService.applyPrPosting）。
 */
export async function createWarrantyClaimsFromPr(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; prId: string; userId: string },
): Promise<CreateWarrantyFromPrResult> {
  const result: CreateWarrantyFromPrResult = { createdIds: [], skippedIds: [] };

  const pr = await tx.nx02Pr.findFirst({
    where: { id: p.prId, tenantId: p.tenantId },
    select: {
      id: true,
      docNo: true,
      prDate: true,
      supplierId: true,
      dispositionFlag: true,
      status: true,
      rev_Nx02PrItem_prId: {
        orderBy: { lineNo: 'asc' },
        select: {
          id: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
        },
      },
    },
  });
  if (!pr) return result;
  // 防呆：只有 W 才走保固（caller 已 guard、helper 內部再驗一次）
  if (pr.dispositionFlag !== 'W') return result;
  // ⚠️ 2026-07-11 C/D 組驗收修 bug：原「status 須已 POSTED」防呆在 tx 內永遠不成立——
  // caller（applyPrPosting）跑在 header status 寫入之前、此處讀到的還是 DRAFT →
  // 靜默 return、保固單從未自動建（階段 I P2 功能死路）。呼叫語境唯一
  // （POSTED transition 交易內）、status 防呆移除、以 dispositionFlag 防呆為準。

  for (const item of pr.rev_Nx02PrItem_prId) {
    // 冪等：sourcePrItemId 已有對應保固單則跳過
    const dup = await tx.nx02WarrantyClaim.findFirst({
      where: {
        tenantId: p.tenantId,
        sourcePrItemId: item.id,
      },
      select: { id: true },
    });
    if (dup) {
      result.skippedIds.push(dup.id);
      continue;
    }

    const qty = new PrismaNs.Decimal(item.qty);
    if (qty.lte(0)) continue;

    const docNo = await allocDocNo(tx, p.tenantId, 'WC', 'HQ0');
    const created = await tx.nx02WarrantyClaim.create({
      data: {
        tenantId: p.tenantId,
        docNo,
        claimType: 'SELF',
        supplierId: pr.supplierId,
        partId: item.partId,
        partNo: item.partNo,
        partName: item.partName,
        qty,
        claimDate: pr.prDate,
        issueDescription: `來自退貨單 ${pr.docNo}（自動建立、待業務補充細節）`,
        status: 'D',
        sourcePrId: pr.id,
        sourcePrItemId: item.id,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
      select: { id: true },
    });
    result.createdIds.push(created.id);
  }

  return result;
}
