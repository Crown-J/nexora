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

/**
 * ⭐ C5：「帳接到哪了」的覆蓋清單。
 * 每一種會動到庫存的來源各一列，直說接上了沒有、本期金額多少。
 * ⚠ 這不是 pass/fail——**沒接上不是錯，是還沒做**。但它必須看得見，
 *    否則存貨那一項的差額永遠只是一個沒人解釋得了的數字。
 */
export interface ReconCoverage {
  sourceModule: string;
  sourceDocType: string;
  label: string;
  /** 總帳有涵蓋這條路了嗎（含「依設計不產生分錄」——那也是涵蓋，不是漏）。 */
  wired: boolean;
  /** 本期該來源造成的庫存淨額（進為正、出為負）。 */
  periodAmount: Dec;
  /** 補充說明：沒接上的是理由，依設計不做分錄的是依據。 */
  reason: string;
}

export interface ReconResult {
  periodCode: string;
  checks: ReconCheck[];
  /** ⭐ 庫存異動來源接上總帳的進度；差額要先看這張表再往下查。 */
  coverage: ReconCoverage[];
  errorCount: number;
  warnCount: number;
  /** 全部通過才是 true。 */
  isClean: boolean;
}

/**
 * 庫存異動的來源代碼 → 接上總帳了沒。
 * key＝`來源模組|來源單別`（庫存流水上的兩個欄位）。
 */
const STOCK_SOURCES: Record<string, { label: string; wired: boolean; reason: string }> = {
  'NX04|S': { label: '銷貨出庫', wired: true, reason: '' },
  'NX02|P': { label: '進貨驗收（採購）', wired: true, reason: '' },
  'NX02|G': { label: '進貨驗收（同行調貨）', wired: true, reason: '' },
  'NX02|R': { label: '進貨退出', wired: true, reason: '' },
  'NX04|R': { label: '銷貨退回入庫', wired: true, reason: '' },
  'NX03|X': { label: '倉庫調撥', wired: true, reason: '' },
  'NX03|T': { label: '盤點盈虧', wired: true, reason: '' },
  'NX03|W': { label: '報廢', wired: true, reason: '' },
  'NX03|I': {
    label: '期初庫存單／其他入庫',
    wired: false,
    reason:
      '🔴 兩張不同的單共用同一個來源代碼，光看流水分不出是哪一種；而且期初庫存單沒有欄位可以分「承接·賒欠／現購／實物出資」。其他入庫則沒有原因欄（領用／樣品／送修的科目完全不同）',
  },
  'NX03|O': {
    label: '其他出庫',
    wired: false,
    reason: '⛔ 單上沒有原因欄，66 個交易代號裡沒有對得上的——硬接等於讓系統自己猜科目',
  },
  'NX03|M': {
    label: '組合',
    wired: true,
    reason: '⭐ 依設計不產生分錄：借貸都是存貨、金額相等（比照資產移轉）',
  },
  'NX03|D': {
    label: '分解',
    wired: true,
    reason: '⭐ 依設計不產生分錄：借貸都是存貨、金額相等（比照資產移轉）',
  },
};

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
  // 🔴 C5 拆細：應收子帳裡混著兩種完全不同的錢，總帳也記在兩個科目，所以要分開比。
  //    客戶欠我們貨款 → 1111 應收帳款；廠商該退我們錢（進貨退出）→ 1113 其他應收款。
  const arCustomer = await db.nx05ArLedger.aggregate({
    where: { tenantId, status: { notIn: ['WRITTEN_OFF'] }, sourceType: { not: 'PR' } },
    _sum: { balanceAmount: true },
  });
  checks.push(
    mk(
      'C1',
      '總帳 1111 應收帳款 ＝ 客戶應收子帳未收餘額',
      new PrismaNs.Decimal(arCustomer._sum.balanceAmount ?? 0),
      await glNet(db, tenantId, period.id, '1111'),
      '差額常見於：銷貨單被安全閘 skip 沒過帳、期初應收未開帳、或收款只更新了子帳',
    ),
  );

  const arVendor = await db.nx05ArLedger.aggregate({
    where: { tenantId, status: { notIn: ['WRITTEN_OFF'] }, sourceType: 'PR' },
    _sum: { balanceAmount: true },
  });
  checks.push(
    mk(
      'C1b',
      '總帳 1113 其他應收款 ＝ 廠商退款應收餘額（進貨退出）',
      new PrismaNs.Decimal(arVendor._sum.balanceAmount ?? 0),
      await glNet(db, tenantId, period.id, '1113'),
      '⚠ 1113 還有別的用途（代墊款、員工借支、保固索賠的廠商退款），那些尚未接上總帳時會有差額',
      'WARN',
    ),
  );

  const apAgg = await db.nx05ApLedger.aggregate({
    where: { tenantId, status: { notIn: ['VOID'] } },
    _sum: { balanceAmount: true },
  });
  // ⚠ 已知的時間差：有採購單時應付在「廠商確認」就建了，總帳卻要等驗收才記。
  //    把它算出來寫進提示，差額才是可解釋的數字、而不是一個沒人知道怎麼來的謎。
  const confirmedNotReceived = await db.nx05ApLedger.aggregate({
    where: {
      tenantId,
      status: { notIn: ['VOID'] },
      sourceType: 'PO',
      po: { rev_Nx02Rr_poId: { none: { status: 'POSTED' } } },
    },
    _sum: { balanceAmount: true },
  });
  const cnr = new PrismaNs.Decimal(confirmedNotReceived._sum.balanceAmount ?? 0);
  checks.push(
    mk(
      'C2',
      '總帳 2101 應付帳款 ＝ 應付子帳未付餘額',
      new PrismaNs.Decimal(apAgg._sum.balanceAmount ?? 0).neg(), // 負債：貸餘
      await glNet(db, tenantId, period.id, '2101'),
      cnr.isZero()
        ? '差額常見於：進貨單被安全閘 skip（國外進貨／金額對不上）、期初應付未開帳'
        : `其中 ${cnr.toString()} 是**已確認但還沒到貨**的採購單——應付子帳在廠商確認就建了、` +
          '總帳等驗收才記，這一段是時間差不是錯。剩下的差額才要往「被安全閘 skip 的單」查',
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
      '⚠ 這一項是「帳跟貨對不對得起來」的總開關。有差額時先看下面的覆蓋清單（哪條路還沒接），' +
        '再看 C3b（分辨是「有單沒過帳」還是「單位成本四捨五入累積」）',
    ),
  );

  // 🔴 C5 新增：庫存子帳自己的內部一致性。
  //    庫存餘額表是「數量 × 平均單價」重算出來的，平均單價只存到小數第四位；
  //    庫存流水則是每一筆金額直接累加。兩者數學上等價，但**捨入不等價**。
  //    ⭐ 有了這一項，C3 的差額才分得出是「有單沒過帳」（真問題）還是「捨入累積」（可解釋）。
  const ledgerAll = await db.nx03StockLedger.groupBy({
    by: ['movementType'],
    where: { tenantId },
    _sum: { totalCost: true },
  });
  const ledgerNet = ledgerAll.reduce(
    (a, g) =>
      g.movementType === 'I'
        ? a.add(new PrismaNs.Decimal(g._sum.totalCost ?? 0))
        : a.sub(new PrismaNs.Decimal(g._sum.totalCost ?? 0)),
    D0,
  );
  checks.push(
    mk(
      'C3b',
      '庫存餘額表的存貨價值 ＝ 庫存流水累計（庫存子帳的自我一致性）',
      ledgerNet,
      new PrismaNs.Decimal(stockAgg._sum.stockValue ?? 0),
      '⚠ 這一項不牽涉總帳。差額多半是兩種原因：① 餘額是匯入的快照、背後沒有流水（開帳前的常態）；' +
        '② 平均單價只存到小數第四位，每進一次貨捨入一次、誤差會累積。' +
        '🔴 若這一項有差額，C3 就**不可能**剛好是 0——先解釋這一項，再解釋 C3',
      'WARN',
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

  // 🔴 C5 新增：進貨單也要有同樣的抓手。
  //    國外進貨是**依設計不接**（進口費用已攤進存貨、應付只有貨款，借貸兜不起來）→ 先扣掉，
  //    剩下的差額才是真的「該過帳而沒過帳」。
  const inPeriod = { gte: period.startDate, lte: period.endDate };
  const postedRr = await db.nx02Rr.count({
    where: { tenantId, status: 'POSTED', voidedAt: null, rrDate: inPeriod },
  });
  const importedRr = await db.nx02Rr.count({
    where: {
      tenantId,
      status: 'POSTED',
      voidedAt: null,
      rrDate: inPeriod,
      rev_Nx02RrImport_rrId: { some: {} },
    },
  });
  const rrVouchers = await db.nx05Voucher.count({
    where: { tenantId, fiscalPeriodId: period.id, sourceDocType: 'RR', status: 'POSTED' },
  });
  checks.push(
    mk(
      'D2',
      '本期已過帳的進貨單都有對應傳票（國外進貨依設計不接、已扣除）',
      new PrismaNs.Decimal(postedRr - importedRr),
      new PrismaNs.Decimal(rrVouchers),
      importedRr > 0
        ? `本期有 ${importedRr} 張國外進貨依設計不接（已從應有張數扣掉）。` +
          '剩下的差額要查：單據金額與實際入庫金額對不上（短交但金額沒調）、或推不出成本中心'
        : '差額要查：單據金額與實際入庫金額對不上（短交但金額沒調）、或推不出成本中心',
    ),
  );

  // 退貨兩條路：走保固的進貨退出依設計不接（由保固索賠處理），先扣掉
  const postedPr = await db.nx02Pr.count({
    where: { tenantId, status: 'P', voidedAt: null, prDate: inPeriod },
  });
  const warrantyPr = await db.nx02Pr.count({
    where: { tenantId, status: 'P', voidedAt: null, prDate: inPeriod, dispositionFlag: 'W' },
  });
  const prVouchers = await db.nx05Voucher.count({
    where: { tenantId, fiscalPeriodId: period.id, sourceDocType: 'PR', status: 'POSTED' },
  });
  checks.push(
    mk(
      'D3',
      '本期已過帳的進貨退出／折讓都有對應傳票（走保固的依設計不接、已扣除）',
      new PrismaNs.Decimal(postedPr - warrantyPr),
      new PrismaNs.Decimal(prVouchers),
      '差額要查：退出金額與實際退出去的庫存金額對不上、或推不出成本中心',
    ),
  );

  const errorCount = checks.filter((c) => !c.passed && c.severity === 'ERROR').length;
  const warnCount = checks.filter((c) => !c.passed && c.severity === 'WARN').length;

  // ── ⭐ 覆蓋清單：「帳接到哪了」──────────────────────────
  const bySource = await db.nx03StockLedger.groupBy({
    by: ['sourceModule', 'sourceDocType', 'movementType'],
    where: { tenantId, movementDate: inPeriod },
    _sum: { totalCost: true },
  });
  const amountBySource = new Map<string, Dec>();
  for (const g of bySource) {
    const key = `${g.sourceModule}|${g.sourceDocType}`;
    const amt = new PrismaNs.Decimal(g._sum.totalCost ?? 0);
    const cur = amountBySource.get(key) ?? D0;
    amountBySource.set(key, g.movementType === 'I' ? cur.add(amt) : cur.sub(amt));
  }
  // 已知的來源全部列出來（本期金額 0 也要列——「這條路今天沒動」跟「這條路不存在」是兩件事）；
  // 資料裡出現、但清單上沒有的來源也要列，那代表有人加了新來源卻沒回頭想過帳
  const keys = new Set([...Object.keys(STOCK_SOURCES), ...amountBySource.keys()]);
  const coverage: ReconCoverage[] = [...keys]
    .sort()
    .map((key) => {
      const [sourceModule = '', sourceDocType = ''] = key.split('|');
      const known = STOCK_SOURCES[key];
      return {
        sourceModule,
        sourceDocType,
        label: known?.label ?? `⚠ 未登錄的來源 ${key}`,
        wired: known?.wired ?? false,
        periodAmount: amountBySource.get(key) ?? D0,
        reason:
          known?.reason ??
          '🔴 這個來源不在覆蓋清單上——代表有人新增了會動庫存的路徑，卻沒有回頭決定它怎麼過帳',
      };
    });

  return {
    periodCode: period.code,
    checks,
    coverage,
    errorCount,
    warnCount,
    isClean: errorCount === 0 && warnCount === 0,
  };
}
