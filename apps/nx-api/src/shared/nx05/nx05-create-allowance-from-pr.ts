// apps/nx-api/src/shared/nx05/nx05-create-allowance-from-pr.ts
// 從 returnMode='A' 折讓退貨單建立 NX05 進貨折讓單（冪等）
//
// 對齊：
//   - TASK-NX02-IMPL-01 Phase 5 commit 5a（Crown Q-5a-1=a inline helper、避免 NX05 service 跨模組污染）
//   - overview §3.8 退貨 3 種並存 + Crown Q19=d
//   - 既有範式：nx05-create-ap-from-po.ts（同目錄、結構鏡像）
//
// 業務語意：
//   - returnMode='A' 折讓不退：貨保留原倉位、不沖庫存
//   - 寫 Nx05Allowance allowanceType='P' 進貨折讓（廠商給我方）
//   - 寫 Nx05AllowanceItem disposalMethod='O' 沖銷 AP（既有 AP 抵扣）
//   - refApId 串既有 AP（從 PR.rrId → Rr.poId → ApLedger.poId 反推）
//
// 冪等策略：
//   - 透過 remark prefix `PR:<docNo>` 標記去重
//   - 同 PR 重複呼叫直接 return existing id

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx05DocNo, orgCodeFromDocNo } from './nx05-doc-no';
import { assertFinancePeriodMutable } from './nx05-period-lock';

const PR_ALLOWANCE_REMARK_PREFIX = 'PR:';

/** 退貨類型 A 折讓不退時、從 PR 建立 NX05 進貨折讓單（冪等）。回傳 Allowance id 或既有 id。 */
export async function createAllowanceFromPurchaseReturn(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; prId: string; userId: string },
): Promise<string | null> {
  // 1. load PR head + items
  const pr = await tx.nx02Pr.findFirst({
    where: { id: p.prId, tenantId: p.tenantId, voidedAt: null },
    select: {
      id: true,
      docNo: true,
      prDate: true,
      supplierId: true,
      rrId: true,
      returnMode: true,
      currencyId: true,
      rev_Nx02PrItem_prId: {
        select: {
          id: true,
          lineNo: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
          unitCost: true,
          lineAmount: true,
          returnReason: true,
          remark: true,
        },
        orderBy: { lineNo: 'asc' },
      },
    },
  });
  if (!pr) return null;
  if (pr.returnMode !== 'A') return null; // 非折讓模式不建 Allowance
  if (!pr.rev_Nx02PrItem_prId.length) return null;

  // 2. dedup check（用 remark prefix）
  const remarkMarker = `${PR_ALLOWANCE_REMARK_PREFIX}${pr.docNo}`;
  const dup = await tx.nx05Allowance.findFirst({
    where: { tenantId: p.tenantId, remark: { startsWith: remarkMarker } },
    select: { id: true },
  });
  if (dup) return dup.id;

  // 2.5 FinancePeriod 校驗（NX05-IMPL-01 Phase 4 補強 A026 backlog 既知邊界、對齊既有 allowance.service line 122 範式）
  await assertFinancePeriodMutable(tx, p.tenantId, pr.prDate);

  // 3. 找對應 AP（從 PR.rrId → Rr.poId → ApLedger.poId 反推、可能 null）
  let refApId: string | null = null;
  if (pr.rrId) {
    const rr = await tx.nx02Rr.findFirst({
      where: { id: pr.rrId, tenantId: p.tenantId },
      select: { poId: true },
    });
    if (rr?.poId) {
      const ap = await tx.nx05ApLedger.findFirst({
        where: { tenantId: p.tenantId, poId: rr.poId },
        select: { id: true },
      });
      refApId = ap?.id ?? null;
    }
  }

  // 4. 算 totalAmount = SUM(items.lineAmount)
  const totalAmount = pr.rev_Nx02PrItem_prId.reduce(
    (acc, it) => acc.add(new PrismaNs.Decimal(it.lineAmount)),
    new PrismaNs.Decimal(0),
  );

  // 5. alloc Allowance docNo（從 PR.docNo 推機構碼、AL-YYYYMM-機構碼-NNNNN）
  const orgCode = orgCodeFromDocNo(pr.docNo);
  const docNo = await allocNx05DocNo(tx, p.tenantId, 'AL', orgCode);

  // 6. 建 Nx05Allowance
  const allowance = await tx.nx05Allowance.create({
    data: {
      tenantId: p.tenantId,
      docNo,
      allowanceType: 'P', // P=進貨折讓（廠商給我方）
      partnerId: pr.supplierId,
      allowanceDate: pr.prDate,
      refApId,
      totalAmount,
      status: 'DRAFT',
      remark: `${remarkMarker} 折讓不退、貨保留原倉位`,
      createdBy: p.userId,
      updatedBy: p.userId,
    },
    select: { id: true },
  });

  // 7. 建 Nx05AllowanceItem rows（每 PR item 一行）
  let lineNo = 1;
  for (const it of pr.rev_Nx02PrItem_prId) {
    await tx.nx05AllowanceItem.create({
      data: {
        allowanceId: allowance.id,
        lineNo: lineNo++,
        // returnReason 1-char enum → 業務描述
        reason: mapReturnReason(it.returnReason) + (it.remark ? ` / ${it.remark}` : ''),
        amount: new PrismaNs.Decimal(it.lineAmount),
        disposalMethod: 'O', // O=沖銷 AP（折讓抵應付）
        refDocId: pr.rrId, // 來源 RR
        refDocType: 'RR',
        remark: `Part ${it.partNo} (line ${it.lineNo}) qty=${it.qty.toString()}`,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });
  }

  return allowance.id;
}

/** returnReason 1-char enum → 業務語意 */
function mapReturnReason(code: string): string {
  const map: Record<string, string> = {
    E: '數量多餘',
    D: '外觀損壞',
    F: '功能異常',
    W: '規格不符',
    O: '其他',
  };
  return map[code] ?? '其他';
}
