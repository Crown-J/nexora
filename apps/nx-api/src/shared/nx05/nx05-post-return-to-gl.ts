// apps/nx-api/src/shared/nx05/nx05-post-return-to-gl.ts
// ⭐ 總帳脊椎 C4：退貨三條路接上總帳——進貨退出／進貨折讓／銷貨退回（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md §14「接進貨與庫存」
//
// 上位原則③ 因果單向：本檔**只讀營運資料、只寫總帳**，⛔ 一行都不回頭寫 nx02/nx03/nx04。
//
// 🔴 這一支的核心判斷：**退貨的「錢」流向哪裡，要看系統實際建了什麼，不是看規則書怎麼寫**
//   （與 B6「帳要跟著系統實際做的事走」同一條原則）。
//
//   · 進貨退出（退貨給廠商、貨真的出去）：規則書原本只寫「借應付」，
//     但系統實測建的是**應收**（廠商欠我方退款）。2026-08-01 執行長拍板：
//     這筆應收要用 1113 其他應收款、**跟客戶的 1111 應收帳款分開**——
//     同一個數字不能同時代表「客戶欠我們貨款」跟「廠商該退我們錢」。
//     ⚠ 走保固模式的退出不建應收（由保固索賠另外處理）→ 本支不過帳。
//
//   · 進貨折讓（貨不退、只降價）：系統建的折讓單就是沖銷應付 → 規則書的形狀是對的。
//
//   · 銷貨退回：系統建的是折讓單，而且分兩種——
//       「下次折抵」→ 沖減應收（客戶下次採購扣掉）
//       「現金退回」→ 🔴 **這是負債，不是應收的減少**。記成沖應收會讓帳面顯示兩不相欠，
//                     但真實方向相反（我們欠客戶錢），退款義務會就此從報表上消失。
//                     2026-08-01 執行長拍板新增 2142 其他應付款承接。
//     ⭐ 走哪一條**不看請求參數、看系統實際建出來的折讓單**——參數沒有存下來，
//        折讓單有。這樣重跑或事後補過帳都會得到同一個答案。

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { resolveCostCenter, type CostCenterSource } from './nx05-cost-center';
import { postByRule } from './nx05-post-by-rule';

export type ReturnGlSkipReason =
  | 'ALREADY_POSTED'
  | 'DOC_NOT_FOUND'
  | 'NO_POSTING_RULE'
  | 'NO_OPEN_PERIOD'
  | 'NO_DEPARTMENT'
  /** 單據金額與實際庫存異動金額不一致（同 C2 的短交問題）。 */
  | 'AMOUNT_MISMATCH'
  /** 沒有金額可記。 */
  | 'NO_AMOUNT'
  /** 走保固模式的進貨退出：不建應收、由保固索賠另外處理。 */
  | 'WARRANTY_ROUTE'
  /** 銷貨退回換新（貨沒有真的回到我方倉、也沒有建折讓單）。 */
  | 'NO_ALLOWANCE';

export interface ReturnGlResult {
  voucherId: string | null;
  docNo: string | null;
  skipped: ReturnGlSkipReason | null;
  ruleCode: 'PR' | 'PD' | 'SR' | null;
  /** 銷貨退回：退款義務落在哪裡。REFUND＝欠客戶的錢、OFFSET＝沖減應收。 */
  settleMode: 'REFUND' | 'OFFSET' | null;
  costCenterSource: CostCenterSource;
}

const SKIP = (r: ReturnGlSkipReason): ReturnGlResult => ({
  voucherId: null,
  docNo: null,
  skipped: r,
  ruleCode: null,
  settleMode: null,
  costCenterSource: 'NONE',
});

function orgFromDocNo(docNo: string): string {
  const parts = docNo.split('-');
  return parts.length >= 3 ? parts[2]! : 'HQ0';
}

async function findExisting(
  tx: Prisma.TransactionClient,
  tenantId: string,
  docType: string,
  docId: string,
): Promise<ReturnGlResult | null> {
  const dup = await tx.nx05Voucher.findFirst({
    where: { tenantId, sourceDocType: docType, sourceDocId: docId },
    select: { id: true, docNo: true },
  });
  if (!dup) return null;
  return {
    voucherId: dup.id,
    docNo: dup.docNo,
    skipped: 'ALREADY_POSTED',
    ruleCode: null,
    settleMode: null,
    costCenterSource: 'NONE',
  };
}

async function openPeriodExists(
  tx: Prisma.TransactionClient,
  tenantId: string,
  ruleCode: string,
  date: Date,
): Promise<ReturnGlSkipReason | null> {
  const rule = await tx.nx05PostingRule.findFirst({
    where: { tenantId, code: ruleCode, status: 'ACTIVE', isActive: true },
    select: { id: true },
  });
  if (!rule) return 'NO_POSTING_RULE';
  const period = await tx.nx05FiscalPeriod.findFirst({
    where: { tenantId, startDate: { lte: date }, endDate: { gte: date }, status: 'OPEN' },
    select: { id: true },
  });
  if (!period) return 'NO_OPEN_PERIOD';
  return null;
}

// ─────────────────────────────────────────────────────────────
// 進貨退出 PR ／ 進貨折讓 PD
// ─────────────────────────────────────────────────────────────

/**
 * 進貨退出／折讓過帳完成時產生總帳分錄。
 * ⚠ 必須在 `applyPrPosting` 之後呼叫——退出的存貨金額要跟它寫下的庫存流水核對。
 */
export async function postPrToGl(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; prId: string; userId: string },
): Promise<ReturnGlResult> {
  const { tenantId, prId } = p;
  const dup = await findExisting(tx, tenantId, 'PR', prId);
  if (dup) return dup;

  const pr = await tx.nx02Pr.findFirst({
    where: { id: prId, tenantId, voidedAt: null },
    select: {
      docNo: true, prDate: true, supplierId: true, warehouseId: true,
      returnMode: true, dispositionFlag: true,
      subtotal: true, taxAmount: true, totalAmount: true, createdBy: true,
    },
  });
  if (!pr) return SKIP('DOC_NOT_FOUND');

  // 折讓不退貨 → PD（沖銷應付、存貨不動）；全退／部分退 → PR
  const isAllowance = pr.returnMode === 'A';
  const ruleCode: 'PR' | 'PD' = isAllowance ? 'PD' : 'PR';

  // ⚠ 走保固模式的退出不建應收（由保固索賠另外處理）→ 這裡不過帳，避免帳上憑空多一筆應收
  if (!isAllowance && pr.dispositionFlag === 'W') return SKIP('WARRANTY_ROUTE');

  const blocked = await openPeriodExists(tx, tenantId, ruleCode, pr.prDate);
  if (blocked) return SKIP(blocked);

  const cc = await resolveCostCenter(tx, {
    tenantId, warehouseId: pr.warehouseId, fallbackUserId: pr.createdBy,
  });
  if (!cc.departmentId) return SKIP('NO_DEPARTMENT');

  const net = new PrismaNs.Decimal(pr.subtotal);
  const tax = new PrismaNs.Decimal(pr.taxAmount);
  const gross = new PrismaNs.Decimal(pr.totalAmount);
  if (gross.lte(0)) return SKIP('NO_AMOUNT');
  if (!net.add(tax).equals(gross)) return SKIP('AMOUNT_MISMATCH');

  if (!isAllowance) {
    // 退出：存貨減少的金額必須等於實際退出去的庫存流水，否則總帳與庫存餘額表對不起來
    const outAgg = await tx.nx03StockLedger.aggregate({
      where: {
        tenantId, sourceModule: 'NX02', sourceDocType: 'R', sourceDocId: prId, movementType: 'O',
      },
      _sum: { totalCost: true },
    });
    const stockOut = new PrismaNs.Decimal(outAgg._sum.totalCost ?? 0);
    if (stockOut.lte(0)) return SKIP('NO_AMOUNT');
    if (!net.equals(stockOut)) return SKIP('AMOUNT_MISMATCH');
  }

  const r = await postByRule(tx, {
    tenantId,
    actorUserId: p.userId,
    ruleCode,
    voucherDate: pr.prDate,
    orgCode: orgFromDocNo(pr.docNo),
    source: { docType: 'PR', docId: prId, docNo: pr.docNo },
    origin: 'AUTO',
    summary: `${isAllowance ? '進貨折讓' : '進貨退出'} ${pr.docNo}`,
    amounts: { NET: net, TAX: tax, GROSS: gross },
    dimensions: { departmentId: cc.departmentId, partnerId: pr.supplierId },
    // 🔴 借方二選一：系統建的是應收（廠商欠我方退款）→ 走 1113，不走沖抵應付
    lineOverrides: isAllowance ? {} : { 1: { skip: true } },
  });

  return {
    voucherId: r.voucherId, docNo: r.docNo, skipped: null, ruleCode,
    settleMode: null, costCenterSource: cc.source,
  };
}

// ─────────────────────────────────────────────────────────────
// 銷貨退回 SR
// ─────────────────────────────────────────────────────────────

/** 折讓單的來源標記前綴（與 nx05-create-allowance-from-sr.ts 一致）。 */
const SR_ALLOWANCE_REMARK_PREFIX = 'SR:';

/**
 * 銷貨退回過帳完成時產生總帳分錄。
 * ⚠ 必須在 `applySrPosting` ＋ 折讓單建立之後呼叫。
 */
export async function postSrToGl(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; srId: string; userId: string },
): Promise<ReturnGlResult> {
  const { tenantId, srId } = p;
  const dup = await findExisting(tx, tenantId, 'SR', srId);
  if (dup) return dup;

  const sr = await tx.nx04Sr.findFirst({
    where: { id: srId, tenantId },
    select: {
      docNo: true, srDate: true, customerId: true, warehouseId: true,
      subtotal: true, taxAmount: true, totalAmount: true, createdBy: true,
    },
  });
  if (!sr) return SKIP('DOC_NOT_FOUND');

  const blocked = await openPeriodExists(tx, tenantId, 'SR', sr.srDate);
  if (blocked) return SKIP(blocked);

  const cc = await resolveCostCenter(tx, {
    tenantId, warehouseId: sr.warehouseId, fallbackUserId: sr.createdBy,
  });
  if (!cc.departmentId) return SKIP('NO_DEPARTMENT');

  const net = new PrismaNs.Decimal(sr.subtotal);
  const tax = new PrismaNs.Decimal(sr.taxAmount);
  const gross = new PrismaNs.Decimal(sr.totalAmount);
  if (gross.lte(0)) return SKIP('NO_AMOUNT');
  if (!net.add(tax).equals(gross)) return SKIP('AMOUNT_MISMATCH');

  // ⭐ 退錢還是折抵，看系統實際建出來的折讓單，不看請求參數（參數沒有存下來、折讓單有）
  const allowance = await tx.nx05Allowance.findFirst({
    where: {
      tenantId, allowanceType: 'S',
      remark: { startsWith: `${SR_ALLOWANCE_REMARK_PREFIX}${sr.docNo}` },
    },
    select: { rev_Nx05AllowanceItem_allowanceId: { select: { disposalMethod: true }, take: 1 } },
  });
  if (!allowance) return SKIP('NO_ALLOWANCE');
  const disposal = allowance.rev_Nx05AllowanceItem_allowanceId[0]?.disposalMethod ?? 'D';
  const settleMode: 'REFUND' | 'OFFSET' = disposal === 'R' ? 'REFUND' : 'OFFSET';

  // 退回好品才會有入庫流水；壞品不入庫（成本 0）→ 結轉成本兩行自動不出現
  const inAgg = await tx.nx03StockLedger.aggregate({
    where: {
      tenantId, sourceModule: 'NX04', sourceDocType: 'R', sourceDocId: srId, movementType: 'I',
    },
    _sum: { totalCost: true },
  });
  const cost = new PrismaNs.Decimal(inAgg._sum.totalCost ?? 0);

  const r = await postByRule(tx, {
    tenantId,
    actorUserId: p.userId,
    ruleCode: 'SR',
    voucherDate: sr.srDate,
    orgCode: orgFromDocNo(sr.docNo),
    source: { docType: 'SR', docId: srId, docNo: sr.docNo },
    origin: 'AUTO',
    summary: `銷貨退回 ${sr.docNo}`,
    amounts: { NET: net, TAX: tax, GROSS: gross, COST: cost },
    dimensions: { departmentId: cc.departmentId, partnerId: sr.customerId },
    // 🔴 貸方二選一：退現金＝欠客戶的錢（負債），折抵＝沖減應收
    lineOverrides:
      settleMode === 'REFUND'
        ? { 3: { skip: true } }
        : { 6: { skip: true } },
  });

  return {
    voucherId: r.voucherId, docNo: r.docNo, skipped: null, ruleCode: 'SR',
    settleMode, costCenterSource: cc.source,
  };
}
