// apps/nx-api/src/shared/nx05/nx05-create-ap-from-rr.ts
// 從 NX02 RR POSTED 建立 NX05 應付帳款（LITE 直接路徑、冪等）
//
// 對齊：
//   - TASK-NX05-IMPL-01 Phase 4 commit
//   - overview §5.1「LITE 階段：跳過 PO、直接 RR → AP；PLUS 階段：PO → AP」
//   - audit-01 §1.4 揭露「Nx02Rr → AP（LITE 路徑）」schema reverse 已備、service 0 實作
//   - 既有範式：nx05-create-ap-from-po.ts（同目錄、結構鏡像）
//
// 業務語意：
//   - RR POSTED 時呼叫（無對應 PO 時走此路徑、有 PO 則 PO confirmed 早已建 AP）
//   - sourceType='RR' （區分 PO 路徑）
//   - dueDate 依 supplier.paymentTermDomestic 計算（業界 NET30 預設）
//   - 冪等：query 既有 AP_RR 對應 rrId 存在則 skip
//
// 本軌僅 export helper、不 wire 到 nx02 rr.service（避免改 NX02 production 行為、留後續軌 NX02 LITE 路徑啟動時 wire）

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

/** RR POSTED（無對應 PO）時建立 NX05 應付帳款（冪等）。回傳 AP id 或既有 id。 */
export async function createApFromPostedRr(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; rrId: string; userId: string },
): Promise<string | null> {
  // dedup：query 既有 AP sourceType='RR' rrId 已存在則 skip
  const dup = await tx.nx05ApLedger.findFirst({
    where: { tenantId: p.tenantId, rrId: p.rrId },
    select: { id: true },
  });
  if (dup) return dup.id;

  // load RR head
  const rr = await tx.nx02Rr.findFirst({
    where: { id: p.rrId, tenantId: p.tenantId, voidedAt: null },
    select: {
      id: true,
      docNo: true,
      rrDate: true,
      supplierId: true,
      currencyId: true,
      totalAmount: true,
      poId: true,
    },
  });
  if (!rr) return null;
  if (rr.poId) return null; // 有 PO → 已 PO confirmed 建過 AP、不重複建

  // load supplier paymentTerm
  const sup = await tx.nx01Partner.findFirst({
    where: { id: rr.supplierId, tenantId: p.tenantId },
    select: { paymentTermDomestic: true },
  });
  const paymentTerm = sup?.paymentTermDomestic ?? 'NET30';

  const orgCode = orgCodeFromDocNo(rr.docNo);
  const docNo = await allocNx05DocNo(tx, p.tenantId, 'AP', orgCode);
  const total = new PrismaNs.Decimal(rr.totalAmount);
  const apDate = new Date(rr.rrDate);
  const dueDate = addNetDays(apDate, paymentTerm);

  const ap = await tx.nx05ApLedger.create({
    data: {
      tenantId: p.tenantId,
      docNo,
      sourceType: 'RR',
      rrId: p.rrId,
      supplierId: rr.supplierId,
      apDate,
      dueDate,
      currencyId: rr.currencyId,
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
