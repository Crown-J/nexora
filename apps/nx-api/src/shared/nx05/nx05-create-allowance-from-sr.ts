// apps/nx-api/src/shared/nx05/nx05-create-allowance-from-sr.ts
// 從 returnAction='R'/'D' 銷退單建立 NX05 銷貨折讓單（冪等）
//
// 對齊：
//   - TASK-NX04-IMPL-01 Phase 4 commit 4a（仿 NX02 Phase 5 commit 5a inline helper 範式）
//   - overview §10 銷退退款 3 種並存（Crown Q10）
//   - Crown Q-C3=A returnAction R/D/X 拍板
//   - 既有範式：nx05-create-allowance-from-pr.ts（同目錄、結構鏡像、PR→SR 鏡像）
//
// 業務語意：
//   - returnAction='R' 退錢：寫 Allowance + disposalMethod='R' 現金退回（後續 NX05 paylog 執行退款）
//   - returnAction='D' 折讓：寫 Allowance + disposalMethod='D' 下次折抵（客戶下次採購抵扣）
//   - returnAction='X' 換新：不走此 helper（sales-return.service 入口 skip）
//   - 寫 Nx05Allowance allowanceType='S' 銷貨折讓（我方給客戶）
//   - refArId 串既有 AR（從 SR.soId → ArLedger.soId 反推、可能 null）
//
// 冪等策略：
//   - 透過 remark prefix `SR:<docNo>` 標記去重
//   - 同 SR 重複呼叫直接 return existing id

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx05DocNo, orgCodeFromDocNo } from './nx05-doc-no';
import { assertFinancePeriodMutable } from './nx05-period-lock';

const SR_ALLOWANCE_REMARK_PREFIX = 'SR:';

export type SrReturnAction = 'R' | 'D' | 'X';

/** 從 SR 建立 NX05 銷貨折讓單（冪等）。returnAction R/D 走 Allowance、X 不呼叫。回傳 Allowance id 或 null。 */
export async function createAllowanceFromSalesReturn(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; srId: string; userId: string; returnAction: SrReturnAction },
): Promise<string | null> {
  // X 換新：不走 Allowance（業務員手動建新 SO）
  if (p.returnAction === 'X') return null;

  // 1. load SR head + items
  const sr = await tx.nx04Sr.findFirst({
    where: { id: p.srId, tenantId: p.tenantId },
    select: {
      id: true,
      docNo: true,
      srDate: true,
      customerId: true,
      soId: true,
      rev_Nx04SrItem_srId: {
        select: {
          id: true,
          lineNo: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
          unitPrice: true,
          lineAmount: true,
          returnReason: true,
          returnType: true,
          remark: true,
        },
        orderBy: { lineNo: 'asc' },
      },
    },
  });
  if (!sr) return null;
  if (!sr.rev_Nx04SrItem_srId.length) return null;

  // 2. dedup check（用 remark prefix）
  const remarkMarker = `${SR_ALLOWANCE_REMARK_PREFIX}${sr.docNo}`;
  const dup = await tx.nx05Allowance.findFirst({
    where: { tenantId: p.tenantId, remark: { startsWith: remarkMarker } },
    select: { id: true },
  });
  if (dup) return dup.id;

  // 2.5 FinancePeriod 校驗（NX05-IMPL-01 Phase 4 補強 A026 backlog 既知邊界、對齊既有 allowance.service line 122 範式）
  await assertFinancePeriodMutable(tx, p.tenantId, sr.srDate);

  // 3. 找對應 AR（從 SR.soId → ArLedger.soId 反推、可能 null）
  let refArId: string | null = null;
  const ar = await tx.nx05ArLedger.findFirst({
    where: { tenantId: p.tenantId, soId: sr.soId },
    select: { id: true },
  });
  refArId = ar?.id ?? null;

  // 4. 算 totalAmount = SUM(items.lineAmount)
  const totalAmount = sr.rev_Nx04SrItem_srId.reduce(
    (acc, it) => acc.add(new PrismaNs.Decimal(it.lineAmount)),
    new PrismaNs.Decimal(0),
  );

  // 5. alloc Allowance docNo（從 SR.docNo 推機構碼、AL-YYYYMM-機構碼-NNNNN）
  const orgCode = orgCodeFromDocNo(sr.docNo);
  const docNo = await allocNx05DocNo(tx, p.tenantId, 'AL', orgCode);

  // 6. 建 Nx05Allowance
  const actionLabel = p.returnAction === 'R' ? '退錢' : '折讓下次採購';
  const allowance = await tx.nx05Allowance.create({
    data: {
      tenantId: p.tenantId,
      docNo,
      allowanceType: 'S', // S=銷貨折讓（我方給客戶）
      partnerId: sr.customerId,
      allowanceDate: sr.srDate,
      refArId,
      totalAmount,
      status: 'DRAFT',
      remark: `${remarkMarker} ${actionLabel}`,
      createdBy: p.userId,
      updatedBy: p.userId,
    },
    select: { id: true },
  });

  // 7. 建 Nx05AllowanceItem rows（每 SR item 一行）
  // disposalMethod：R 退錢→'R' 現金退回、D 折讓→'D' 下次折抵
  const disposalMethod = p.returnAction === 'R' ? 'R' : 'D';
  let lineNo = 1;
  for (const it of sr.rev_Nx04SrItem_srId) {
    await tx.nx05AllowanceItem.create({
      data: {
        allowanceId: allowance.id,
        lineNo: lineNo++,
        reason: mapSrReturnReason(it.returnReason) + (it.remark ? ` / ${it.remark}` : ''),
        amount: new PrismaNs.Decimal(it.lineAmount),
        disposalMethod,
        refDocId: sr.soId, // 來源 SO
        refDocType: 'SO',
        remark: `Part ${it.partNo} (line ${it.lineNo}) qty=${it.qty.toString()}`,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });
  }

  return allowance.id;
}

/** SR returnReason 1-char enum → 業務語意（對齊 schema Nx04SrItem.returnReason） */
function mapSrReturnReason(code: string): string {
  const map: Record<string, string> = {
    C: '客戶不需要',
    D: '商品有瑕疵',
    W: '送錯料號',
    Q: '送錯數量',
    O: '其他',
  };
  return map[code] ?? '其他';
}
