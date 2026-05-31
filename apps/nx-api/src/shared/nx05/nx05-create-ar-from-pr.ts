// apps/nx-api/src/shared/nx05/nx05-create-ar-from-pr.ts
// v1.2 階段 F P3：廠商退費單（PR POSTED）→ 應收（冪等）
//
// 對齊：
//   - 意圖書 §2.1 應收來源：銷貨單 + 廠商退費單
//   - Alex Q1=a-1 對齊 Nx05ApLedger 多來源範式（source_type + 多 source FK）
//   - 範式鏡像 nx05-create-ar-from-so.ts（SO→AR）
//
// 業務語意：
//   - PR POSTED（廠商退費已過帳）→ 廠商欠我方退款 → 進應收
//   - source_type='PR' / pr_id 串既有 PR / so_id=null
//   - customer_id 寫 PR.supplierId（廠商即此筆應收的「對象」）
//   - paymentTerm 拿 partner.paymentTermDomestic（預設 NET30）
//
// 冪等策略：依 (tenantId, prId) 找既有 row、有則 return existing id

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx05DocNo, orgCodeFromDocNo } from './nx05-doc-no';

function addNetDays(base: Date, paymentTerm: string): Date {
  const m = paymentTerm.match(/NET(\d+)/i);
  const days = m ? parseInt(m[1]!, 10) : 30;
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** PR POSTED（廠商退費過帳）→ 應收（冪等）。回傳 AR id 或既有 id；PR 不存在或已撤銷返 null。 */
export async function createArFromPostedPr(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; prId: string; userId: string },
): Promise<string | null> {
  const dup = await tx.nx05ArLedger.findFirst({
    where: { tenantId: p.tenantId, prId: p.prId },
    select: { id: true },
  });
  if (dup) return dup.id;

  const pr = await tx.nx02Pr.findFirst({
    where: { id: p.prId, tenantId: p.tenantId },
    select: {
      docNo: true,
      prDate: true,
      supplierId: true,
      currencyId: true,
      totalAmount: true,
      status: true,
      supplier: { select: { paymentTermDomestic: true } },
    },
  });
  if (!pr) return null;
  // PR 必須 POSTED 才產生應收（DRAFT/CANCELLED 不認列）
  if (pr.status !== 'POSTED') return null;

  const paymentTerm = pr.supplier?.paymentTermDomestic || 'NET30';
  const org = orgCodeFromDocNo(pr.docNo);
  const docNo = await allocNx05DocNo(tx, p.tenantId, 'AR', org);
  const total = new PrismaNs.Decimal(pr.totalAmount);
  const arDate = new Date(pr.prDate);
  const dueDate = addNetDays(arDate, paymentTerm);
  const row = await tx.nx05ArLedger.create({
    data: {
      tenantId: p.tenantId,
      docNo,
      sourceType: 'PR',
      soId: null,
      prId: p.prId,
      customerId: pr.supplierId, // 廠商即此筆應收的對象
      arDate,
      dueDate,
      currencyId: pr.currencyId,
      originalAmount: total,
      paidAmount: new PrismaNs.Decimal(0),
      balanceAmount: total,
      status: 'OPEN',
      paymentTerm,
      createdBy: p.userId,
      updatedBy: p.userId,
    },
    select: { id: true },
  });
  return row.id;
}
