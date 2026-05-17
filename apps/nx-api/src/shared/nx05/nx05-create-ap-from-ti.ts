// apps/nx-api/src/shared/nx05/nx05-create-ap-from-ti.ts
// 從 NX02 TI 同行調貨建立 NX05 應付帳款（冪等）
//
// 對齊：
//   - TASK-NX05-IMPL-01 Phase 4 commit
//   - audit-01 §1.4 揭露「Nx02Ti → AP」schema reverse 已備、service 0 實作
//   - 既有範式：nx05-create-ap-from-po.ts + nx05-create-ap-from-rr.ts（同目錄、結構鏡像）
//
// 業務語意：
//   - TI 同行調貨「過帳」（推測 status='P' 待驗收 or 'C' 完成）時觸發
//   - sourceType='TI'
//   - 同行調貨 partner_type='S' 也走 AP 應付（業務上付給同行）
//   - 冪等：query 既有 AP_TI 對應 tiId 存在則 skip
//
// 本軌僅 export helper、不 wire 到 nx02 ti 處理流（NX02 既有無 TI service、TI 過帳邏輯在 qt.service.adoptQt 等、後續軌啟動 TI service 時 wire）

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

/** TI 同行調貨過帳時建立 NX05 應付帳款（冪等）。回傳 AP id 或既有 id。 */
export async function createApFromPostedTi(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; tiId: string; userId: string },
): Promise<string | null> {
  // dedup
  const dup = await tx.nx05ApLedger.findFirst({
    where: { tenantId: p.tenantId, tiId: p.tiId },
    select: { id: true },
  });
  if (dup) return dup.id;

  // load TI head
  const ti = await tx.nx02Ti.findFirst({
    where: { id: p.tiId, tenantId: p.tenantId, voidedAt: null },
    select: {
      id: true,
      docNo: true,
      tiDate: true,
      partnerId: true,
      currencyId: true,
      totalAmount: true,
    },
  });
  if (!ti) return null;

  // load partner paymentTerm（同行通常現金、預設 CASH）
  const partner = await tx.nx01Partner.findFirst({
    where: { id: ti.partnerId, tenantId: p.tenantId },
    select: { paymentTermDomestic: true },
  });
  const paymentTerm = partner?.paymentTermDomestic ?? 'NET30';

  const orgCode = orgCodeFromDocNo(ti.docNo);
  const docNo = await allocNx05DocNo(tx, p.tenantId, 'AP', orgCode);
  const total = new PrismaNs.Decimal(ti.totalAmount);
  const apDate = new Date(ti.tiDate);
  const dueDate = addNetDays(apDate, paymentTerm);

  const ap = await tx.nx05ApLedger.create({
    data: {
      tenantId: p.tenantId,
      docNo,
      sourceType: 'TI',
      tiId: p.tiId,
      supplierId: ti.partnerId,
      apDate,
      dueDate,
      currencyId: ti.currencyId,
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

  return ap.id;
}
