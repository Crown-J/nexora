// apps/nx-api/src/shared/nx05/nx05-financial-reports.ts
// ⭐ 總帳脊椎 B5：試算表 ＋ 財務報表查詢（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md v0.4 §2 Q2 拍板
//
// ⛔ 這一層**不建表、不寫任何資料**——全部是查詢。
//    試算表＝科目餘額的一個檢視；財報由 A 階段埋在科目上的三個欄位長出來：
//      · statement          BS 資產負債表／PL 損益表
//      · statementSection   財報段落（資產／負債／權益／營業收入／營業成本／營業費用／營業外損益）
//      · cashFlowType       O 營業／I 投資／F 籌資／C 現金及約當現金／N 不適用
//    落表就是「同一個數字存在兩個地方」，正是恆迎那個病（對映表與科目主檔對不上）。

import { BadRequestException } from '@nestjs/common';
import type { Prisma, PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

type Db = PrismaClient | Prisma.TransactionClient;
type Dec = PrismaNs.Decimal;
const D0 = new PrismaNs.Decimal(0);

/** 取數口徑：PERIOD＝只看本期發生額；YTD＝年初至本期末累計（期末餘額）。 */
export type ReportMode = 'PERIOD' | 'YTD';

interface RawRow {
  accountCode: string;
  accountName: string;
  parentCode: string | null;
  classCode: string | null;
  statement: string | null;
  statementSection: string | null;
  cashFlowType: string;
  departmentId: string | null;
  departmentName: string | null;
  openingDebit: Dec;
  openingCredit: Dec;
  periodDebit: Dec;
  periodCredit: Dec;
  closingDebit: Dec;
  closingCredit: Dec;
}

async function loadPeriod(
  db: Db,
  tenantId: string,
  periodCode: string,
): Promise<{ id: string; code: string; status: string; fiscalYear: number }> {
  const p = await db.nx05FiscalPeriod.findFirst({
    where: { tenantId, code: periodCode },
    select: { id: true, code: true, status: true, fiscalYear: true },
  });
  if (!p) throw new BadRequestException(`報表失敗：找不到會計期間 ${periodCode}`);
  return p;
}

async function loadRows(
  db: Db,
  tenantId: string,
  periodId: string,
  departmentId?: string | null,
): Promise<RawRow[]> {
  const rows = await db.nx05GlBalance.findMany({
    where: {
      tenantId,
      fiscalPeriodId: periodId,
      ...(departmentId !== undefined ? { departmentId } : {}),
    },
    select: {
      departmentId: true,
      openingDebit: true,
      openingCredit: true,
      periodDebit: true,
      periodCredit: true,
      closingDebit: true,
      closingCredit: true,
      department: { select: { name: true } },
      accountCode: {
        select: {
          code: true,
          name: true,
          cashFlowType: true,
          statementSection: true,
          parent: { select: { code: true } },
          accountClass: { select: { code: true, statement: true, statementSection: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    accountCode: r.accountCode.code,
    accountName: r.accountCode.name,
    parentCode: r.accountCode.parent?.code ?? null,
    classCode: r.accountCode.accountClass?.code ?? null,
    statement: r.accountCode.accountClass?.statement ?? null,
    // 科目上的覆寫優先（例 1122 進貨附加成本歸「存貨」段），沒有才用類別的
    statementSection:
      r.accountCode.statementSection ?? r.accountCode.accountClass?.statementSection ?? null,
    cashFlowType: r.accountCode.cashFlowType,
    departmentId: r.departmentId,
    departmentName: r.department?.name ?? null,
    openingDebit: new PrismaNs.Decimal(r.openingDebit),
    openingCredit: new PrismaNs.Decimal(r.openingCredit),
    periodDebit: new PrismaNs.Decimal(r.periodDebit),
    periodCredit: new PrismaNs.Decimal(r.periodCredit),
    closingDebit: new PrismaNs.Decimal(r.closingDebit),
    closingCredit: new PrismaNs.Decimal(r.closingCredit),
  }));
}

/** 淨額（借正貸負）。 */
function net(d: Dec, c: Dec): Dec {
  return d.sub(c);
}

// ────────────────────────────────────────────────────────────
// ① 試算表
// ────────────────────────────────────────────────────────────

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  openingDebit: Dec;
  openingCredit: Dec;
  periodDebit: Dec;
  periodCredit: Dec;
  closingDebit: Dec;
  closingCredit: Dec;
}

export interface TrialBalance {
  periodCode: string;
  periodStatus: string;
  rows: TrialBalanceRow[];
  totals: {
    openingDebit: Dec;
    openingCredit: Dec;
    periodDebit: Dec;
    periodCredit: Dec;
    closingDebit: Dec;
    closingCredit: Dec;
  };
  /** 🔴 三組合計都必須左右相等；任一組不等＝帳有問題，不是報表有問題。 */
  isBalanced: boolean;
  imbalance: { opening: Dec; period: Dec; closing: Dec };
}

/**
 * 試算表。⚠ 這不是一張表，是科目餘額的檢視——落表就是存一份會過期的複本。
 * 借貸各自列示（不軋淨額），因為試算表的用途就是「看兩邊等不等」。
 */
export async function getTrialBalance(
  db: Db,
  p: { tenantId: string; periodCode: string; departmentId?: string | null },
): Promise<TrialBalance> {
  const period = await loadPeriod(db, p.tenantId, p.periodCode);
  const raw = await loadRows(db, p.tenantId, period.id, p.departmentId);

  // 同科目跨部門合併（試算表看的是科目，不是成本中心）
  const byAcc = new Map<string, TrialBalanceRow>();
  for (const r of raw) {
    const cur =
      byAcc.get(r.accountCode) ??
      {
        accountCode: r.accountCode,
        accountName: r.accountName,
        openingDebit: D0,
        openingCredit: D0,
        periodDebit: D0,
        periodCredit: D0,
        closingDebit: D0,
        closingCredit: D0,
      };
    cur.openingDebit = cur.openingDebit.add(r.openingDebit);
    cur.openingCredit = cur.openingCredit.add(r.openingCredit);
    cur.periodDebit = cur.periodDebit.add(r.periodDebit);
    cur.periodCredit = cur.periodCredit.add(r.periodCredit);
    cur.closingDebit = cur.closingDebit.add(r.closingDebit);
    cur.closingCredit = cur.closingCredit.add(r.closingCredit);
    byAcc.set(r.accountCode, cur);
  }

  const rows = [...byAcc.values()].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  const totals = rows.reduce(
    (t, r) => ({
      openingDebit: t.openingDebit.add(r.openingDebit),
      openingCredit: t.openingCredit.add(r.openingCredit),
      periodDebit: t.periodDebit.add(r.periodDebit),
      periodCredit: t.periodCredit.add(r.periodCredit),
      closingDebit: t.closingDebit.add(r.closingDebit),
      closingCredit: t.closingCredit.add(r.closingCredit),
    }),
    {
      openingDebit: D0,
      openingCredit: D0,
      periodDebit: D0,
      periodCredit: D0,
      closingDebit: D0,
      closingCredit: D0,
    },
  );

  const imbalance = {
    opening: totals.openingDebit.sub(totals.openingCredit),
    period: totals.periodDebit.sub(totals.periodCredit),
    closing: totals.closingDebit.sub(totals.closingCredit),
  };

  return {
    periodCode: period.code,
    periodStatus: period.status,
    rows,
    totals,
    isBalanced:
      imbalance.opening.isZero() && imbalance.period.isZero() && imbalance.closing.isZero(),
    imbalance,
  };
}

// ────────────────────────────────────────────────────────────
// ② 損益表
// ────────────────────────────────────────────────────────────

export interface IncomeStatementLine {
  accountCode: string;
  accountName: string;
  amount: Dec;
}

export interface IncomeStatement {
  periodCode: string;
  mode: ReportMode;
  revenue: Dec;
  cost: Dec;
  grossProfit: Dec;
  /** 毛利率（%）。營業收入為 0 時為 null。 */
  grossMarginPct: number | null;
  operatingExpense: Dec;
  operatingIncome: Dec;
  nonOperatingIncome: Dec;
  nonOperatingExpense: Dec;
  pretaxIncome: Dec;
  incomeTax: Dec;
  netIncome: Dec;
  lines: {
    revenue: IncomeStatementLine[];
    cost: IncomeStatementLine[];
    expense: IncomeStatementLine[];
    nonOperating: IncomeStatementLine[];
    tax: IncomeStatementLine[];
  };
}

/** 所得稅費用：中類 82（亞羅刻意獨立一個中類、不混進營業費用）。 */
function isIncomeTax(r: RawRow): boolean {
  return r.parentCode === '82';
}

export async function getIncomeStatement(
  db: Db,
  p: {
    tenantId: string;
    periodCode: string;
    /** PERIOD＝只看本期；YTD＝年初至本期末累計（預設）。 */
    mode?: ReportMode;
    departmentId?: string | null;
  },
): Promise<IncomeStatement> {
  const mode: ReportMode = p.mode ?? 'YTD';
  const period = await loadPeriod(db, p.tenantId, p.periodCode);
  const raw = (await loadRows(db, p.tenantId, period.id, p.departmentId)).filter(
    (r) => r.statement === 'PL',
  );

  const pick = (r: RawRow): Dec =>
    mode === 'PERIOD' ? net(r.periodDebit, r.periodCredit) : net(r.closingDebit, r.closingCredit);

  const acc = {
    revenue: D0,
    cost: D0,
    expense: D0,
    nonOpIncome: D0,
    nonOpExpense: D0,
    tax: D0,
  };
  const lines: IncomeStatement['lines'] = {
    revenue: [],
    cost: [],
    expense: [],
    nonOperating: [],
    tax: [],
  };

  // 同科目跨部門先合併
  const merged = new Map<string, { r: RawRow; v: Dec }>();
  for (const r of raw) {
    const cur = merged.get(r.accountCode);
    if (cur) cur.v = cur.v.add(pick(r));
    else merged.set(r.accountCode, { r, v: pick(r) });
  }

  for (const { r, v } of merged.values()) {
    if (v.isZero()) continue;
    // ⚠ 金額方向感知，不用 abs()：收入類以貸方為正、費用類以借方為正。
    //    一律 abs 會讓「銷貨退回」（收入類的借餘）看起來像正的收入。
    const mk = (amt: Dec) => ({ accountCode: r.accountCode, accountName: r.accountName, amount: amt });
    if (isIncomeTax(r)) {
      acc.tax = acc.tax.add(v); // 費用性質：借餘為正
      lines.tax.push(mk(v));
      continue;
    }
    switch (r.classCode) {
      case '4': // 營業收入（含銷貨退回/折讓，兩者是借餘、會自動抵減）
        acc.revenue = acc.revenue.sub(v); // 貸餘 → 轉正
        lines.revenue.push(mk(v.neg()));
        break;
      case '5':
        acc.cost = acc.cost.add(v);
        lines.cost.push(mk(v));
        break;
      case '6':
        acc.expense = acc.expense.add(v);
        lines.expense.push(mk(v));
        break;
      case '7':
        acc.nonOpIncome = acc.nonOpIncome.sub(v);
        lines.nonOperating.push(mk(v.neg()));
        break;
      case '8':
        acc.nonOpExpense = acc.nonOpExpense.add(v);
        lines.nonOperating.push(mk(v));
        break;
      default:
        break;
    }
  }

  const grossProfit = acc.revenue.sub(acc.cost);
  const operatingIncome = grossProfit.sub(acc.expense);
  const pretaxIncome = operatingIncome.add(acc.nonOpIncome).sub(acc.nonOpExpense);
  const netIncome = pretaxIncome.sub(acc.tax);

  for (const k of Object.keys(lines) as (keyof typeof lines)[]) {
    lines[k].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  return {
    periodCode: period.code,
    mode,
    revenue: acc.revenue,
    cost: acc.cost,
    grossProfit,
    grossMarginPct: acc.revenue.isZero()
      ? null
      : Number(grossProfit.div(acc.revenue).mul(100).toFixed(2)),
    operatingExpense: acc.expense,
    operatingIncome,
    nonOperatingIncome: acc.nonOpIncome,
    nonOperatingExpense: acc.nonOpExpense,
    pretaxIncome,
    incomeTax: acc.tax,
    netIncome,
    lines,
  };
}

// ────────────────────────────────────────────────────────────
// ③ 資產負債表
// ────────────────────────────────────────────────────────────

export interface BalanceSheetLine {
  accountCode: string;
  accountName: string;
  amount: Dec;
}

export interface BalanceSheet {
  periodCode: string;
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  totalAssets: Dec;
  totalLiabilities: Dec;
  /** 權益科目合計（不含尚未結轉的本期損益）。 */
  totalEquityAccounts: Dec;
  /**
   * 🔴 尚未結轉的本期損益。年度結帳前，損益科目還有餘額、還沒進 3201，
   * 資產負債表要把它當成權益的一部分才會平——這是報表的責任，不是帳的問題。
   */
  unclosedNetIncome: Dec;
  /** 權益合計＝權益科目 ＋ 尚未結轉的本期損益。 */
  totalEquity: Dec;
  /** 🔴 資產 ＝ 負債 ＋ 權益。 */
  isBalanced: boolean;
  imbalance: Dec;
}

export async function getBalanceSheet(
  db: Db,
  p: { tenantId: string; periodCode: string; departmentId?: string | null },
): Promise<BalanceSheet> {
  const period = await loadPeriod(db, p.tenantId, p.periodCode);
  const raw = await loadRows(db, p.tenantId, period.id, p.departmentId);

  const merged = new Map<string, { r: RawRow; v: Dec }>();
  for (const r of raw) {
    const v = net(r.closingDebit, r.closingCredit);
    const cur = merged.get(r.accountCode);
    if (cur) cur.v = cur.v.add(v);
    else merged.set(r.accountCode, { r, v });
  }

  const assets: BalanceSheetLine[] = [];
  const liabilities: BalanceSheetLine[] = [];
  const equity: BalanceSheetLine[] = [];
  let totalAssets = D0;
  let totalLiabilities = D0;
  let totalEquityAccounts = D0;
  let plNet = D0; // 損益科目淨額（借正貸負）

  for (const { r, v } of merged.values()) {
    if (r.statement === 'PL') {
      plNet = plNet.add(v);
      continue;
    }
    if (v.isZero()) continue;
    // ⚠ 方向感知，不用 abs()：資產以借方為正、負債與權益以貸方為正。
    //    一律 abs 會讓「累計折舊」（資產類的貸餘）看起來像正資產。
    const mkL = (amt: Dec) => ({ accountCode: r.accountCode, accountName: r.accountName, amount: amt });
    switch (r.classCode) {
      case '1':
        assets.push(mkL(v));
        totalAssets = totalAssets.add(v);
        break;
      case '2':
        liabilities.push(mkL(v.neg()));
        totalLiabilities = totalLiabilities.sub(v); // 貸餘 → 轉正
        break;
      case '3':
        equity.push(mkL(v.neg()));
        totalEquityAccounts = totalEquityAccounts.sub(v);
        break;
      default:
        break;
    }
  }

  // 損益科目借正貸負：貸餘（負）＝獲利 → 取負號轉成正的本期損益
  const unclosedNetIncome = plNet.neg();
  const totalEquity = totalEquityAccounts.add(unclosedNetIncome);
  const imbalance = totalAssets.sub(totalLiabilities).sub(totalEquity);

  for (const arr of [assets, liabilities, equity]) {
    arr.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  return {
    periodCode: period.code,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquityAccounts,
    unclosedNetIncome,
    totalEquity,
    isBalanced: imbalance.isZero(),
    imbalance,
  };
}

// ────────────────────────────────────────────────────────────
// ④ 現金流量分類彙總
// ────────────────────────────────────────────────────────────

export interface CashFlowSummary {
  periodCode: string;
  operating: Dec;
  investing: Dec;
  financing: Dec;
  /** 現金及約當現金科目的本期淨變動（借增貸減）。 */
  cashMovement: Dec;
  /** 三大活動合計是否等於現金淨變動。 */
  isReconciled: boolean;
  difference: Dec;
}

/**
 * ⚠ 這**不是**正式的現金流量表，是「現金流量分類彙總」。
 *
 * 它做得到的：把本期非現金科目的變動按 cashFlowType（O/I/F）歸類，並與現金科目的淨變動核對。
 * 它做不到的：正式的間接法現金流量表要從本期損益出發、加回非現金項目（折舊、攤提）、
 *   再調整營運資產負債的變動——那需要逐科目的性質判斷與分錄層對手方分析。
 *
 * 🔴 建議：正式現金流量表獨立成一步（B5b 或報表模組），並先拍板採直接法或間接法。
 *   本函式的用途是**驗證 cashFlowType 有沒有標對**——三大活動合計必須等於現金淨變動，
 *   不等就代表有科目的 cash_flow_type 標錯或漏標（標成 N）。
 *
 * ⚠⚠ **必須在年度結帳「之前」跑**。年度結帳的分錄是非現金的重分類
 *   （損益科目 → 3202 → 3201），而 3201 累積盈餘的現金流量分類是「不適用」，
 *   結轉的金額就會消失在三大活動之外 → 核對必然出現差額，而那不是標籤錯。
 *   ⭐ 這是實測踩到才發現的：同一期在結帳前核對相符、結帳後差額 −200。
 */
export async function getCashFlowSummary(
  db: Db,
  p: { tenantId: string; periodCode: string },
): Promise<CashFlowSummary> {
  const period = await loadPeriod(db, p.tenantId, p.periodCode);
  const raw = await loadRows(db, p.tenantId, period.id);

  let operating = D0;
  let investing = D0;
  let financing = D0;
  let cashMovement = D0;

  for (const r of raw) {
    const v = net(r.periodDebit, r.periodCredit);
    if (v.isZero()) continue;
    switch (r.cashFlowType) {
      case 'C':
        cashMovement = cashMovement.add(v);
        break;
      // 非現金科目的變動 → 取反號即為它對現金的影響
      case 'O':
        operating = operating.sub(v);
        break;
      case 'I':
        investing = investing.sub(v);
        break;
      case 'F':
        financing = financing.sub(v);
        break;
      default:
        break; // N 不適用
    }
  }

  const difference = operating.add(investing).add(financing).sub(cashMovement);
  return {
    periodCode: period.code,
    operating,
    investing,
    financing,
    cashMovement,
    isReconciled: difference.isZero(),
    difference,
  };
}
