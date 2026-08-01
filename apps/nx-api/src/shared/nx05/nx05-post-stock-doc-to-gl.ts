// apps/nx-api/src/shared/nx05/nx05-post-stock-doc-to-gl.ts
// ⭐ 總帳脊椎 C3：庫存三張單接上總帳——調撥／盤點盈虧／報廢（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md §14「接進貨與庫存」
//
// 上位原則③ 因果單向：本檔**只讀營運資料、只寫總帳**，⛔ 一行都不回頭寫 nx03。
// 三支放同一檔的理由：金額來源都是同一張庫存流水表、成本中心都走同一支解析器，
// 差別只在交易代號與借貸方向——拆三個檔會讓同一套邏輯抄三遍。
//
// 🔴 三個各自的判斷（比程式碼重要）：
//   · 調撥 TRF：同科目、不同成本中心、金額相等 → 不產生任何損益。
//     ⭐ 但兩邊如果是**同一個成本中心**（同一據點內的倉對倉），那就連維度都沒變化，
//        借貸會完全相同、看起來像沒發生任何事 → 不開傳票（比照資產移轉「依設計不做分錄」）。
//   · 盤點 IADJ：一張盤點單可能同時有盤盈和盤虧。⛔ 不軋成淨額——
//     5103 的餘額是「庫位制度有沒有落實」的直接量測，軋淨額會讓它失真。
//     四條分錄行同時出現、各給各的金額，借貸自然相等。
//   · 報廢 SCRP：成本為 0 時不開傳票。不良品倉的成本本來就是 0，
//     報廢只減數量、沒有會計事件（規則備註自己寫著「只適用良品倉」）。

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { resolveCostCenter, type CostCenterSource } from './nx05-cost-center';
import { postByRule } from './nx05-post-by-rule';

export type StockGlSkipReason =
  | 'ALREADY_POSTED'
  | 'DOC_NOT_FOUND'
  | 'NO_POSTING_RULE'
  | 'NO_OPEN_PERIOD'
  | 'NO_DEPARTMENT'
  /** 金額為 0 或沒有庫存流水 → 沒有會計事件。 */
  | 'NO_AMOUNT'
  /** 🔴 調撥兩端是同一個成本中心：借貸完全相同，開了也看不出發生過什麼事。 */
  | 'SAME_COST_CENTER';

export interface StockGlResult {
  voucherId: string | null;
  docNo: string | null;
  skipped: StockGlSkipReason | null;
  amount: PrismaNs.Decimal | null;
  costCenterSource: CostCenterSource;
}

const SKIP = (r: StockGlSkipReason): StockGlResult => ({
  voucherId: null,
  docNo: null,
  skipped: r,
  amount: null,
  costCenterSource: 'NONE',
});

/** 從單號取機構碼（第三段）；取不到用 HQ0。 */
function orgFromDocNo(docNo: string): string {
  const parts = docNo.split('-');
  return parts.length >= 3 ? parts[2]! : 'HQ0';
}

/** 冪等：同一張單只過一次帳。 */
async function findExisting(
  tx: Prisma.TransactionClient,
  tenantId: string,
  docType: string,
  docId: string,
): Promise<StockGlResult | null> {
  const dup = await tx.nx05Voucher.findFirst({
    where: { tenantId, sourceDocType: docType, sourceDocId: docId },
    select: { id: true, docNo: true },
  });
  if (!dup) return null;
  return {
    voucherId: dup.id,
    docNo: dup.docNo,
    skipped: 'ALREADY_POSTED',
    amount: null,
    costCenterSource: 'NONE',
  };
}

/** 安全閘：規則有沒有啟用 ＋ 該日期有沒有開帳中的會計期間。 */
async function gate(
  tx: Prisma.TransactionClient,
  tenantId: string,
  ruleCode: string,
  date: Date,
): Promise<StockGlSkipReason | null> {
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

/** 庫存流水彙總：某張單造成的進（I）或出（O）金額合計。 */
async function ledgerSum(
  tx: Prisma.TransactionClient,
  p: {
    tenantId: string;
    sourceModule: string;
    sourceDocType: string;
    sourceDocId: string;
    movementType: 'I' | 'O';
    warehouseId?: string;
  },
): Promise<PrismaNs.Decimal> {
  const agg = await tx.nx03StockLedger.aggregate({
    where: {
      tenantId: p.tenantId,
      sourceModule: p.sourceModule,
      sourceDocType: p.sourceDocType,
      sourceDocId: p.sourceDocId,
      movementType: p.movementType,
      ...(p.warehouseId ? { warehouseId: p.warehouseId } : {}),
    },
    _sum: { totalCost: true },
  });
  return new PrismaNs.Decimal(agg._sum.totalCost ?? 0);
}

// ─────────────────────────────────────────────────────────────
// 倉庫調撥 TRF
// ─────────────────────────────────────────────────────────────

/**
 * 調撥收貨完成時產生總帳分錄。
 * ⚠ 必須在 `applyTransferPosting` 之後呼叫——金額要跟它寫下的庫存流水一致。
 */
export async function postTransferToGl(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; stId: string; userId: string },
): Promise<StockGlResult> {
  const { tenantId, stId } = p;
  const dup = await findExisting(tx, tenantId, 'ST', stId);
  if (dup) return dup;

  const st = await tx.nx03St.findFirst({
    where: { id: stId, tenantId, voidedAt: null },
    select: {
      docNo: true, stDate: true, fromWarehouseId: true, toWarehouseId: true, createdBy: true,
    },
  });
  if (!st) return SKIP('DOC_NOT_FOUND');

  const blocked = await gate(tx, tenantId, 'TRF', st.stDate);
  if (blocked) return SKIP(blocked);

  // 兩端各自的成本中心（借方＝目的倉、貸方＝來源倉）
  const to = await resolveCostCenter(tx, {
    tenantId, warehouseId: st.toWarehouseId, fallbackUserId: st.createdBy,
  });
  const from = await resolveCostCenter(tx, {
    tenantId, warehouseId: st.fromWarehouseId, fallbackUserId: st.createdBy,
  });
  if (!to.departmentId || !from.departmentId) return SKIP('NO_DEPARTMENT');
  // ⭐ 同一個成本中心之間的搬動：借貸同科目同部門同金額，開了也看不出發生過什麼事
  if (to.departmentId === from.departmentId) return SKIP('SAME_COST_CENTER');

  const cost = await ledgerSum(tx, {
    tenantId, sourceModule: 'NX03', sourceDocType: 'X', sourceDocId: stId, movementType: 'O',
  });
  if (cost.lte(0)) return SKIP('NO_AMOUNT');

  const r = await postByRule(tx, {
    tenantId,
    actorUserId: p.userId,
    ruleCode: 'TRF',
    voucherDate: st.stDate,
    orgCode: orgFromDocNo(st.docNo),
    source: { docType: 'ST', docId: stId, docNo: st.docNo },
    origin: 'AUTO',
    summary: `倉庫調撥 ${st.docNo}`,
    amounts: { COST: cost },
    lineOverrides: {
      1: { dimensions: { departmentId: to.departmentId } },
      2: { dimensions: { departmentId: from.departmentId } },
    },
  });

  return {
    voucherId: r.voucherId, docNo: r.docNo, skipped: null, amount: cost,
    costCenterSource: to.source,
  };
}

// ─────────────────────────────────────────────────────────────
// 盤點盈虧 IADJ
// ─────────────────────────────────────────────────────────────

/**
 * 盤點單過帳完成時產生總帳分錄。
 * ⛔ 盤盈與盤虧**不軋淨額**——5103 的餘額是「庫位制度有沒有落實」的量測。
 */
export async function postStockTakeToGl(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; stockTakeId: string; userId: string },
): Promise<StockGlResult> {
  const { tenantId, stockTakeId } = p;
  const dup = await findExisting(tx, tenantId, 'STK', stockTakeId);
  if (dup) return dup;

  const stk = await tx.nx03StockTake.findFirst({
    where: { id: stockTakeId, tenantId, voidedAt: null },
    select: { docNo: true, stockTakeDate: true, warehouseId: true, createdBy: true },
  });
  if (!stk) return SKIP('DOC_NOT_FOUND');

  const blocked = await gate(tx, tenantId, 'IADJ', stk.stockTakeDate);
  if (blocked) return SKIP(blocked);

  const cc = await resolveCostCenter(tx, {
    tenantId, warehouseId: stk.warehouseId, fallbackUserId: stk.createdBy,
  });
  if (!cc.departmentId) return SKIP('NO_DEPARTMENT');

  const base = {
    tenantId, sourceModule: 'NX03', sourceDocType: 'T', sourceDocId: stockTakeId,
  } as const;
  const gain = await ledgerSum(tx, { ...base, movementType: 'I' }); // 盤盈
  const loss = await ledgerSum(tx, { ...base, movementType: 'O' }); // 盤虧
  if (gain.lte(0) && loss.lte(0)) return SKIP('NO_AMOUNT');

  // 四條分錄行各給各的金額：借方＝盤盈存貨＋盤虧損失、貸方＝盤盈利益＋盤虧存貨 → 自然相等
  const r = await postByRule(tx, {
    tenantId,
    actorUserId: p.userId,
    ruleCode: 'IADJ',
    voucherDate: stk.stockTakeDate,
    orgCode: orgFromDocNo(stk.docNo),
    source: { docType: 'STK', docId: stockTakeId, docNo: stk.docNo },
    origin: 'AUTO',
    summary: `盤點盈虧 ${stk.docNo}`,
    amounts: {},
    dimensions: { departmentId: cc.departmentId },
    lineOverrides: {
      1: gain.gt(0) ? { amount: gain } : { skip: true },
      2: gain.gt(0) ? { amount: gain } : { skip: true },
      3: loss.gt(0) ? { amount: loss } : { skip: true },
      4: loss.gt(0) ? { amount: loss } : { skip: true },
    },
  });

  return {
    voucherId: r.voucherId, docNo: r.docNo, skipped: null, amount: gain.sub(loss),
    costCenterSource: cc.source,
  };
}

// ─────────────────────────────────────────────────────────────
// 報廢 SCRP
// ─────────────────────────────────────────────────────────────

/**
 * 報廢單過帳完成時產生總帳分錄。
 * ⚠ 成本 0 不開傳票——不良品倉的成本本來就是 0，報廢只減數量、沒有會計事件。
 */
export async function postDisposalToGl(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; disposalId: string; userId: string },
): Promise<StockGlResult> {
  const { tenantId, disposalId } = p;
  const dup = await findExisting(tx, tenantId, 'DS', disposalId);
  if (dup) return dup;

  const ds = await tx.nx03Disposal.findFirst({
    where: { id: disposalId, tenantId, voidedAt: null },
    select: { docNo: true, disposalDate: true, warehouseId: true, createdBy: true },
  });
  if (!ds) return SKIP('DOC_NOT_FOUND');

  const blocked = await gate(tx, tenantId, 'SCRP', ds.disposalDate);
  if (blocked) return SKIP(blocked);

  const cc = await resolveCostCenter(tx, {
    tenantId, warehouseId: ds.warehouseId, fallbackUserId: ds.createdBy,
  });
  if (!cc.departmentId) return SKIP('NO_DEPARTMENT');

  const cost = await ledgerSum(tx, {
    tenantId, sourceModule: 'NX03', sourceDocType: 'W', sourceDocId: disposalId, movementType: 'O',
  });
  if (cost.lte(0)) return SKIP('NO_AMOUNT');

  const r = await postByRule(tx, {
    tenantId,
    actorUserId: p.userId,
    ruleCode: 'SCRP',
    voucherDate: ds.disposalDate,
    orgCode: orgFromDocNo(ds.docNo),
    source: { docType: 'DS', docId: disposalId, docNo: ds.docNo },
    origin: 'AUTO',
    summary: `報廢 ${ds.docNo}`,
    amounts: { COST: cost },
    dimensions: { departmentId: cc.departmentId },
  });

  return {
    voucherId: r.voucherId, docNo: r.docNo, skipped: null, amount: cost,
    costCenterSource: cc.source,
  };
}
