// apps/nx-api/src/shared/nx05/nx05-gl-reconcile.ts
// ⭐ 總帳脊椎 B7：子帳 vs 總帳驗證（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md v0.6 §5 Q5 拍板
//
// 🔴 上位原則①：「營運事件是因、會計分錄是果，同一筆交易原子產生——沒有第二份數字，
//    對帳從『計算』退化成『驗證』。」
//    這支就是那句話的落地：⛔ **不做任何自動調整**，只把差額指出來給人看。
//    自動調帳＝把帳做平給人看，那正是要避免的事。
//
// ⚠ 差額不為 0 不一定是「總帳錯」——更常見的是：
//    · 該過帳的單據被安全閘 skip 了（租戶還沒設會計期間、推不出成本中心…）
//    · 期初開帳分錄還沒做
//    · 子帳有系統外的手動調整
//    所以每一項檢查都附「怎麼查下去」的提示，而不是只丟一個數字。

import type { Prisma, PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

type Db = PrismaClient | Prisma.TransactionClient;
type Dec = PrismaNs.Decimal;
const D0 = new PrismaNs.Decimal(0);

export interface ReconCheck {
  code: string;
  title: string;
  passed: boolean;
  severity: 'ERROR' | 'WARN';
  /** 子帳／明細側的數字。 */
  expected: Dec;
  /** 總帳側的數字。 */
  actual: Dec;
  difference: Dec;
  /** 差額不為 0 時，該往哪裡查。 */
  hint: string;
}

export interface ReconResult {
  periodCode: string;
  checks: ReconCheck[];
  errorCount: number;
  warnCount: number;
  /** 全部通過才是 true。 */
  isClean: boolean;
}

function mk(
  code: string,
  title: string,
  expected: Dec,
  actual: Dec,
  hint: string,
  severity: 'ERROR' | 'WARN' = 'ERROR',
): ReconCheck {
  const difference = actual.sub(expected);
  return { code, title, passed: difference.isZero(), severity, expected, actual, difference, hint };
}

/** 取總帳某控制科目在該期的期末淨額（借正貸負）。 */
async function glNet(
  db: Db,
  tenantId: string,
  fiscalPeriodId: string,
  accountCode: string,
): Promise<Dec> {
  const rows = await db.nx05GlBalance.findMany({
    where: { tenantId, fiscalPeriodId, accountCode: { code: accountCode } },
    select: { closingDebit: true, closingCredit: true },
  });
  return rows.reduce(
    (a, r) => a.add(new PrismaNs.Decimal(r.closingDebit)).sub(new PrismaNs.Decimal(r.closingCredit)),
    D0,
  );
}

/**
 * ⭐ 子帳 vs 總帳驗證。
 *
 * ⚠ **口徑提醒**：子帳（應收/應付/存貨）拿的是「當下的餘額」，總帳拿的是「指定期間的期末餘額」。
 *    因此這支只有在**最新的那一期**跑才有意義；拿去比對歷史期間一定會有差額，那不是錯。
 */
export async function reconcileGl(
  db: Db,
  p: { tenantId: string; periodCode: string },
): Promise<ReconResult> {
  const { tenantId } = p;
  const period = await db.nx05FiscalPeriod.findFirst({
    where: { tenantId, code: p.periodCode },
    select: { id: true, code: true, startDate: true, endDate: true },
  });
  if (!period) {
    throw new Error(`對帳失敗：找不到會計期間 ${p.periodCode}`);
  }

  const checks: ReconCheck[] = [];

  // ── A. 傳票自身的完整性 ──────────────────────────────
  const vouchers = await db.nx05Voucher.findMany({
    where: { tenantId, fiscalPeriodId: period.id, status: 'POSTED' },
    select: { id: true, docNo: true, totalDebit: true, totalCredit: true },
  });
  const vLines = await db.nx05VoucherLine.groupBy({
    by: ['voucherId', 'drCr'],
    where: { tenantId, voucher: { fiscalPeriodId: period.id, status: 'POSTED' } },
    _sum: { amount: true },
  });
  const lineSum = new Map<string, { d: Dec; c: Dec }>();
  for (const g of vLines) {
    const cur = lineSum.get(g.voucherId) ?? { d: D0, c: D0 };
    const amt = new PrismaNs.Decimal(g._sum.amount ?? 0);
    if (g.drCr === 'D') cur.d = cur.d.add(amt);
    else cur.c = cur.c.add(amt);
    lineSum.set(g.voucherId, cur);
  }

  let unbalanced = 0;
  let headMismatch = 0;
  const badDocs: string[] = [];
  for (const v of vouchers) {
    const s = lineSum.get(v.id) ?? { d: D0, c: D0 };
    if (!s.d.equals(s.c)) {
      unbalanced += 1;
      if (badDocs.length < 5) badDocs.push(v.docNo);
    }
    if (!s.d.equals(new PrismaNs.Decimal(v.totalDebit)) || !s.c.equals(new PrismaNs.Decimal(v.totalCredit))) {
      headMismatch += 1;
    }
  }
  checks.push(
    mk(
      'A1',
      '每張已過帳傳票的分錄借貸相等',
      D0,
      new PrismaNs.Decimal(unbalanced),
      badDocs.length > 0
        ? `不平的傳票：${badDocs.join('、')}。過帳當下驗過平衡，走到這裡代表資料被直接改過`
        : '',
    ),
  );
  checks.push(
    mk(
      'A2',
      '傳票表頭合計 ＝ 分錄行合計',
      D0,
      new PrismaNs.Decimal(headMismatch),
      '表頭與明細對不上，代表有人只改了其中一邊',
    ),
  );

  // ── B. 科目餘額表 vs 分錄行（餘額是增量維護的，會 drift）──
  const byAcc = await db.nx05VoucherLine.groupBy({
    by: ['accountCodeId', 'departmentId', 'drCr'],
    where: { tenantId, voucher: { fiscalPeriodId: period.id, status: 'POSTED' } },
    _sum: { amount: true },
  });
  const recomputed = new Map<string, { d: Dec; c: Dec }>();
  for (const g of byAcc) {
    const key = `${g.accountCodeId}|${g.departmentId ?? ''}`;
    const cur = recomputed.get(key) ?? { d: D0, c: D0 };
    const amt = new PrismaNs.Decimal(g._sum.amount ?? 0);
    if (g.drCr === 'D') cur.d = cur.d.add(amt);
    else cur.c = cur.c.add(amt);
    recomputed.set(key, cur);
  }
  const balRows = await db.nx05GlBalance.findMany({
    where: { tenantId, fiscalPeriodId: period.id },
    select: { accountCodeId: true, departmentId: true, periodDebit: true, periodCredit: true },
  });
  let balDrift = 0;
  for (const b of balRows) {
    const key = `${b.accountCodeId}|${b.departmentId ?? ''}`;
    const r = recomputed.get(key) ?? { d: D0, c: D0 };
    if (
      !r.d.equals(new PrismaNs.Decimal(b.periodDebit)) ||
      !r.c.equals(new PrismaNs.Decimal(b.periodCredit))
    ) {
      balDrift += 1;
    }
    recomputed.delete(key);
  }
  // 分錄行有、餘額表卻沒有的組合
  balDrift += recomputed.size;
  checks.push(
    mk(
      'B1',
      '科目餘額的本期發生額 ＝ 分錄行重算結果',
      D0,
      new PrismaNs.Decimal(balDrift),
      '餘額表是過帳時增量累加的；對不上代表有人繞過 postByRule 直接寫分錄行，或餘額被手動改過',
    ),
  );

  // ── C. 子帳 vs 總帳控制科目 ────────────────────────────
  const arAgg = await db.nx05ArLedger.aggregate({
    where: { tenantId, status: { notIn: ['WRITTEN_OFF'] } },
    _sum: { balanceAmount: true },
  });
  checks.push(
    mk(
      'C1',
      '總帳 1111 應收帳款 ＝ 應收子帳未收餘額',
      new PrismaNs.Decimal(arAgg._sum.balanceAmount ?? 0),
      await glNet(db, tenantId, period.id, '1111'),
      '差額常見於：銷貨單被安全閘 skip 沒過帳、期初應收未開帳、或收款只更新了子帳',
    ),
  );

  const apAgg = await db.nx05ApLedger.aggregate({
    where: { tenantId, status: { notIn: ['VOID'] } },
    _sum: { balanceAmount: true },
  });
  checks.push(
    mk(
      'C2',
      '總帳 2101 應付帳款 ＝ 應付子帳未付餘額',
      new PrismaNs.Decimal(apAgg._sum.balanceAmount ?? 0).neg(), // 負債：貸餘
      await glNet(db, tenantId, period.id, '2101'),
      '進貨驗收尚未接上總帳時，這一項一定有差額——那是進度，不是錯',
    ),
  );

  const stockAgg = await db.nx03StockBalance.aggregate({
    where: { tenantId },
    _sum: { stockValue: true },
  });
  checks.push(
    mk(
      'C3',
      '總帳 1121 存貨 ＝ 庫存餘額表的存貨價值',
      new PrismaNs.Decimal(stockAgg._sum.stockValue ?? 0),
      await glNet(db, tenantId, period.id, '1121'),
      '進貨入庫尚未接上總帳時必然有差額。⚠ 這一項是「帳跟貨對不對得起來」的總開關',
    ),
  );

  const noteR = await db.nx05Note.aggregate({
    where: { tenantId, direction: 'R', status: { in: ['ACTIVE', 'IN_COLLECTION'] } },
    _sum: { amount: true },
  });
  checks.push(
    mk(
      'C4',
      '總帳 1112 應收票據 ＝ 未兌現客票面額',
      new PrismaNs.Decimal(noteR._sum.amount ?? 0),
      await glNet(db, tenantId, period.id, '1112'),
      '收票／託收／兌現尚未接上總帳時必然有差額',
      'WARN',
    ),
  );

  const noteP = await db.nx05Note.aggregate({
    where: { tenantId, direction: 'P', status: { in: ['ACTIVE'] } },
    _sum: { amount: true },
  });
  checks.push(
    mk(
      'C5',
      '總帳 2102 應付票據 ＝ 未兌現開出票面額',
      new PrismaNs.Decimal(noteP._sum.amount ?? 0).neg(),
      await glNet(db, tenantId, period.id, '2102'),
      '開票／兌現尚未接上總帳時必然有差額',
      'WARN',
    ),
  );

  // ── D. 該過帳而沒過帳（安全閘 skip 掉的）────────────────
  const completedSo = await db.nx04So.count({
    where: {
      tenantId,
      status: 'COMPLETED',
      soDate: { gte: period.startDate, lte: period.endDate },
    },
  });
  const postedSo = await db.nx05Voucher.count({
    where: { tenantId, fiscalPeriodId: period.id, sourceDocType: 'SO', status: 'POSTED' },
  });
  checks.push(
    mk(
      'D1',
      '本期已完成的銷貨單都有對應傳票',
      new PrismaNs.Decimal(completedSo),
      new PrismaNs.Decimal(postedSo),
      '🔴 差額＝被安全閘 skip 掉的單（沒設會計期間／推不出成本中心）。' +
        '這一項就是「skip 不是沒事」的抓手——分錄少了會在這裡現形',
    ),
  );

  const errorCount = checks.filter((c) => !c.passed && c.severity === 'ERROR').length;
  const warnCount = checks.filter((c) => !c.passed && c.severity === 'WARN').length;
  return {
    periodCode: period.code,
    checks,
    errorCount,
    warnCount,
    isClean: errorCount === 0 && warnCount === 0,
  };
}
