// apps/nx-api/src/shared/nx05/nx05-post-rr-to-gl.ts
// ⭐ 總帳脊椎 C2：進貨驗收接上總帳——進貨單過帳 → 自動產生分錄（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md §14「接進貨與庫存」
//
// 上位原則③ 因果單向：本檔**只讀營運資料、只寫總帳**，⛔ 一行都不回頭寫 nx02/nx03。
// 沿用 B6 的範式（nx05-post-so-to-gl.ts）：接在既有過帳點、只加一行、保留安全閘。
//
// 🔴 兩個交易代號，看的是「跟誰買」：
//   · 有同行調貨單來源（tiId）→ PO-TR 調貨進貨（對象是同行、個別認定成本、報表要切得出「調貨佔多少」）
//   · 其餘（採購或無單直入）    → PO 進貨
//   兩者分錄形狀相同（借存貨＋借進項稅／貸應付），差別在成本方法與報表歸屬。
//
// 🔴 為什麼存貨金額要先跟庫存流水核對過才敢過帳：
//   進貨單的金額是用**訂購量**算的（lineAmount = qty × unitCost），
//   但庫存是按**實收量**入帳的（effectiveQty = actualQty ?? qty）。
//   短交時兩者會不一致——這是營運端的資料矛盾，不是總帳能解的。
//   ⛔ 硬過的話：存貨跟單走則庫存對不起來、跟庫存走則應付對不起來，兩邊都會壞。
//   ⭐ 所以不一致就 skip 並回報理由，由對帳表列成「該修的單」——
//      帳不替營運端的資料矛盾圓場，這跟 B7「只報告、不自動調帳」是同一條原則。

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { resolveCostCenter, type CostCenterSource } from './nx05-cost-center';
import { postByRule } from './nx05-post-by-rule';

/** 沒過帳的原因。 */
export type RrGlSkipReason =
  | 'ALREADY_POSTED'
  | 'RR_NOT_FOUND'
  | 'NO_POSTING_RULE'
  | 'NO_OPEN_PERIOD'
  | 'NO_DEPARTMENT'
  /** 🔴 國外進貨：進口費用已攤進存貨成本，但應付給廠商的只有貨款，借貸兜不起來。
   *  正解是拆兩張傳票（進口費用先歸集在 1122 再分攤），但目前進口費用沒有自己的單據、
   *  也不知道付給誰 → 本階段不接、由對帳表列出來。 */
  | 'IMPORT_NOT_SUPPORTED'
  /** 🔴 單據金額與實際入庫金額不一致（多半是短交但單價金額沒跟著調）。 */
  | 'AMOUNT_MISMATCH'
  /** 該進貨單沒有任何入庫流水（例：全數瑕疵退回、或還沒真的入庫）。 */
  | 'NO_STOCK_IN';

export interface PostRrToGlResult {
  voucherId: string | null;
  docNo: string | null;
  skipped: RrGlSkipReason | null;
  /** 實際使用的交易代號（PO 或 PO-TR）。 */
  ruleCode: 'PO' | 'PO-TR' | null;
  /** 本次入帳的存貨金額（未稅）。 */
  inventoryAmount: PrismaNs.Decimal | null;
  costCenterSource: CostCenterSource;
}

const SKIP = (r: RrGlSkipReason): PostRrToGlResult => ({
  voucherId: null,
  docNo: null,
  skipped: r,
  ruleCode: null,
  inventoryAmount: null,
  costCenterSource: 'NONE',
});

/**
 * 進貨單過帳完成時產生總帳分錄。
 * ⚠ 必須在 `applyRrPosting` 之後呼叫——存貨金額要跟它寫下的庫存流水核對。
 */
export async function postRrToGl(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; rrId: string; userId: string },
): Promise<PostRrToGlResult> {
  const { tenantId, rrId } = p;

  // ── 冪等：同一張進貨單只過一次帳 ──
  const dup = await tx.nx05Voucher.findFirst({
    where: { tenantId, sourceDocType: 'RR', sourceDocId: rrId },
    select: { id: true, docNo: true },
  });
  if (dup)
    return {
      voucherId: dup.id,
      docNo: dup.docNo,
      skipped: 'ALREADY_POSTED',
      ruleCode: null,
      inventoryAmount: null,
      costCenterSource: 'NONE',
    };

  const rr = await tx.nx02Rr.findFirst({
    where: { id: rrId, tenantId, voidedAt: null },
    select: {
      docNo: true,
      rrDate: true,
      supplierId: true,
      warehouseId: true,
      poId: true,
      tiId: true,
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
      createdBy: true,
    },
  });
  if (!rr) return SKIP('RR_NOT_FOUND');

  const ruleCode: 'PO' | 'PO-TR' = rr.tiId ? 'PO-TR' : 'PO';

  // ── 安全閘 1：租戶套過帳規則了嗎 ──
  const rule = await tx.nx05PostingRule.findFirst({
    where: { tenantId, code: ruleCode, status: 'ACTIVE', isActive: true },
    select: { id: true },
  });
  if (!rule) return SKIP('NO_POSTING_RULE');

  // ── 安全閘 2：該日期有開帳中的會計期間嗎（＝總帳啟用了嗎）──
  const period = await tx.nx05FiscalPeriod.findFirst({
    where: { tenantId, startDate: { lte: rr.rrDate }, endDate: { gte: rr.rrDate }, status: 'OPEN' },
    select: { id: true },
  });
  if (!period) return SKIP('NO_OPEN_PERIOD');

  // ── 安全閘 3：國外進貨本階段不接 ──
  const imported = await tx.nx02RrImport.findFirst({ where: { rrId }, select: { id: true } });
  if (imported) return SKIP('IMPORT_NOT_SUPPORTED');

  // ── 成本中心：收貨倉 → 據點 → 成本中心，據點沒設才退回建單人的部門 ──
  const cc = await resolveCostCenter(tx, {
    tenantId,
    warehouseId: rr.warehouseId,
    fallbackUserId: rr.createdBy,
  });
  if (!cc.departmentId) return SKIP('NO_DEPARTMENT');

  // ── 🔴 存貨金額：先跟庫存流水核對過才敢過帳 ──
  // 入庫流水的來源代碼：採購 'P'／同行調貨 'G'（applyRrPosting 依 tiId 分流）
  const stockDocType = rr.tiId ? 'G' : 'P';
  const inAgg = await tx.nx03StockLedger.aggregate({
    where: { tenantId, sourceModule: 'NX02', sourceDocType: stockDocType, sourceDocId: rrId, movementType: 'I' },
    _sum: { totalCost: true },
  });
  const stockIn = new PrismaNs.Decimal(inAgg._sum.totalCost ?? 0);
  if (stockIn.lte(0)) return SKIP('NO_STOCK_IN');

  const net = new PrismaNs.Decimal(rr.subtotal);
  const tax = new PrismaNs.Decimal(rr.taxAmount);
  const gross = new PrismaNs.Decimal(rr.totalAmount);
  // ⚠ 三個都要自洽：存貨＋進項稅 必須等於 應付，否則 postByRule 的借貸平衡會擋下來
  if (!net.add(tax).equals(gross)) return SKIP('AMOUNT_MISMATCH');
  // ⚠ 且存貨金額必須等於實際入庫金額，否則總帳與庫存餘額表永遠對不起來
  if (!net.equals(stockIn)) return SKIP('AMOUNT_MISMATCH');

  // ── 應付的往來對象：有採購單時以「付款對象」優先（直送鏈：收貨方≠付款方）──
  let payTo: string = rr.supplierId;
  if (rr.poId) {
    const po = await tx.nx02Po.findFirst({
      where: { id: rr.poId, tenantId },
      select: { invoiceToPartnerId: true },
    });
    payTo = po?.invoiceToPartnerId ?? rr.supplierId;
  }

  const r = await postByRule(tx, {
    tenantId,
    actorUserId: p.userId,
    ruleCode,
    voucherDate: rr.rrDate,
    orgCode: orgFromDocNo(rr.docNo),
    source: { docType: 'RR', docId: rrId, docNo: rr.docNo },
    origin: 'AUTO',
    summary: `${rr.tiId ? '調貨進貨' : '進貨'} ${rr.docNo}`,
    amounts: { NET: net, TAX: tax, GROSS: gross },
    dimensions: { departmentId: cc.departmentId, partnerId: payTo },
  });

  return {
    voucherId: r.voucherId,
    docNo: r.docNo,
    skipped: null,
    ruleCode,
    inventoryAmount: net,
    costCenterSource: cc.source,
  };
}

/** 從單號取機構碼（第三段）；取不到用 HQ0。 */
function orgFromDocNo(docNo: string): string {
  const parts = docNo.split('-');
  return parts.length >= 3 ? parts[2]! : 'HQ0';
}
