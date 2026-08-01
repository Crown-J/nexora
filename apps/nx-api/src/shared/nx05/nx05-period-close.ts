// apps/nx-api/src/shared/nx05/nx05-period-close.ts
// ⭐ 總帳脊椎 B4：餘額結轉（期初→本期→期末）＋ 年度結帳（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md v0.3 §6 B4
//
// 兩支能力：
//   ① carryForwardToPeriod  上期期末 → 本期期初
//   ② closeFiscalYear       年度結帳：結清損益科目 → 3202 本期損益 → 3201 累積盈餘
//
// 🔴🔴 這裡補了亞羅 67 個交易代號的一個真缺口：
//   `CLS` 只做「借 3202 本期損益／貸 3201 累積盈餘」——但**沒有任何代號把損益科目結清進 3202**。
//   少了那一步，3202 永遠是 0、CLS 結轉的是空氣，收入與費用會一路累積下去。
//   ⚠ 這正是恆迎的病：損益科目 28 年從未結轉，資產負債表要重算才平、帳上「累積盈餘」不能直接用。
//   為什麼它不能寫成過帳規則：結清的行數取決於「當年有哪些科目有餘額」，是變動形狀，
//   而 nx05_posting_rule 是固定樣板。→ 由本檔動態產生。

import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx05DocNo } from './nx05-doc-no';
import { applyToGlBalance, postByRule } from './nx05-post-by-rule';

type Dec = PrismaNs.Decimal;
const D0 = new PrismaNs.Decimal(0);

/** 年度結帳傳票的來源標記（供冪等檢查與查詢）。 */
export const YEAR_END_DOC_TYPE = 'YEAR_END';

// ────────────────────────────────────────────────────────────
// ① 期初結轉
// ────────────────────────────────────────────────────────────

export interface CarryForwardResult {
  fromPeriodCode: string;
  toPeriodCode: string;
  rowCount: number;
  crossedFiscalYear: boolean;
}

/**
 * 上期期末餘額 → 本期期初餘額。
 *
 * ⚠ 上一期必須已關帳——沒關帳的期間數字還會動，結轉過來的期初就是錯的。
 * 🔴 跨年度時會檢查「損益科目是否已結清」：年度結帳沒做就結轉，等於把去年的收入費用
 *    帶進今年繼續累積——就是恆迎那個病。這裡直接擋下。
 */
export async function carryForwardToPeriod(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; actorUserId: string; toPeriodCode: string },
): Promise<CarryForwardResult> {
  const to = await tx.nx05FiscalPeriod.findFirst({
    where: { tenantId: p.tenantId, code: p.toPeriodCode },
    select: { id: true, code: true, status: true, fiscalYear: true, periodNo: true },
  });
  if (!to) throw new BadRequestException(`結轉失敗：找不到會計期間 ${p.toPeriodCode}`);
  if (to.status === 'CLOSED') {
    throw new BadRequestException(`結轉失敗：期間 ${to.code} 已關帳，不得改期初餘額`);
  }

  // 上一期＝同租戶裡「年度×期別」剛好排在它前面的那一期
  const prev = await tx.nx05FiscalPeriod.findFirst({
    where: {
      tenantId: p.tenantId,
      OR: [
        { fiscalYear: to.fiscalYear, periodNo: { lt: to.periodNo } },
        { fiscalYear: { lt: to.fiscalYear } },
      ],
    },
    orderBy: [{ fiscalYear: 'desc' }, { periodNo: 'desc' }],
    select: { id: true, code: true, status: true, fiscalYear: true },
  });
  if (!prev) {
    throw new BadRequestException(
      `結轉失敗：${to.code} 沒有上一期。首期的期初餘額請走開帳（期初開帳分錄），不是結轉`,
    );
  }
  if (prev.status !== 'CLOSED') {
    throw new BadRequestException(
      `結轉失敗：上一期 ${prev.code} 尚未關帳（狀態 ${prev.status}）。` +
        `沒關帳的期間數字還會動，結轉過來的期初會是錯的`,
    );
  }

  const crossedFiscalYear = prev.fiscalYear !== to.fiscalYear;

  const prevRows = await tx.nx05GlBalance.findMany({
    where: { tenantId: p.tenantId, fiscalPeriodId: prev.id },
    select: {
      accountCodeId: true,
      departmentId: true,
      closingDebit: true,
      closingCredit: true,
      accountCode: { select: { code: true, name: true, accountClass: { select: { statement: true } } } },
    },
  });

  // 🔴 跨年度守門：損益科目的期末必須已結清為 0
  if (crossedFiscalYear) {
    const unclosed = prevRows.filter(
      (r) =>
        r.accountCode.accountClass?.statement === 'PL' &&
        !new PrismaNs.Decimal(r.closingDebit).equals(new PrismaNs.Decimal(r.closingCredit)),
    );
    if (unclosed.length > 0) {
      const sample = unclosed
        .slice(0, 3)
        .map((r) => `${r.accountCode.code} ${r.accountCode.name}`)
        .join('、');
      throw new BadRequestException(
        `結轉失敗：${prev.code} 是 ${prev.fiscalYear} 年度的最後一期，但損益科目尚未結清` +
          `（${unclosed.length} 個科目仍有餘額，例如 ${sample}）。` +
          `請先執行年度結帳，否則去年的收入費用會被帶進今年繼續累積`,
      );
    }
  }

  let rowCount = 0;
  for (const r of prevRows) {
    // 🔴 期初餘額帶的是「淨額、單邊」，不是把上期的借貸總額原封搬過來。
    //    上期期末借 1000／貸 1000 的科目，餘額是 0——那是上期的活動量，不是新期間的起點。
    //    照總額搬會讓每一期的期初越滾越大，而且損益科目結清後仍會被帶進新年度。
    const net = new PrismaNs.Decimal(r.closingDebit).sub(new PrismaNs.Decimal(r.closingCredit));
    if (net.isZero()) continue; // 餘額為 0（含已結清的損益科目）→ 新期間不必開列
    const openD = net.isPositive() ? net : D0;
    const openC = net.isNegative() ? net.abs() : D0;

    const existing = await tx.nx05GlBalance.findFirst({
      where: {
        tenantId: p.tenantId,
        fiscalPeriodId: to.id,
        accountCodeId: r.accountCodeId,
        departmentId: r.departmentId,
      },
      select: { id: true, periodDebit: true, periodCredit: true },
    });

    if (existing) {
      const pd = new PrismaNs.Decimal(existing.periodDebit);
      const pc = new PrismaNs.Decimal(existing.periodCredit);
      await tx.nx05GlBalance.update({
        where: { id: existing.id },
        data: {
          openingDebit: openD,
          openingCredit: openC,
          closingDebit: openD.add(pd),
          closingCredit: openC.add(pc),
          recalculatedAt: new Date(),
          updatedBy: p.actorUserId,
        },
      });
    } else {
      await tx.nx05GlBalance.create({
        data: {
          tenantId: p.tenantId,
          fiscalPeriodId: to.id,
          accountCodeId: r.accountCodeId,
          departmentId: r.departmentId,
          openingDebit: openD,
          openingCredit: openC,
          closingDebit: openD,
          closingCredit: openC,
          recalculatedAt: new Date(),
          createdBy: p.actorUserId,
          updatedBy: p.actorUserId,
        },
      });
    }
    rowCount += 1;
  }

  return { fromPeriodCode: prev.code, toPeriodCode: to.code, rowCount, crossedFiscalYear };
}

// ────────────────────────────────────────────────────────────
// ② 年度結帳
// ────────────────────────────────────────────────────────────

export interface CloseFiscalYearResult {
  fiscalYear: number;
  periodCode: string;
  /** 結清損益科目那張傳票（沒有損益餘額時為 null）。 */
  plCloseVoucherNo: string | null;
  /** 3202 → 3201 那張傳票（損益為 0 時為 null）。 */
  clsVoucherNo: string | null;
  /** 本期損益：正數＝獲利、負數＝虧損。 */
  netIncome: Dec;
  closedAccountCount: number;
}

/**
 * ⭐ 年度結帳。兩步，缺一不可：
 *   步驟 1（🔴 亞羅缺的那一步）：把所有損益科目的餘額結清 → 差額進 `3202 本期損益`
 *   步驟 2（亞羅的 `CLS`）：`3202` → `3201 累積盈餘`
 *
 * ⚠ 兩步都以正式傳票產生、都進科目餘額——年度結帳不是報表動作，是真的分錄。
 */
export async function closeFiscalYear(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; actorUserId: string; fiscalYear: number; orgCode?: string },
): Promise<CloseFiscalYearResult> {
  const orgCode = p.orgCode ?? 'HQ0';

  // 年度最後一期（isYearEnd 標記；沒標則取該年度期別最大的那一期）
  const period =
    (await tx.nx05FiscalPeriod.findFirst({
      where: { tenantId: p.tenantId, fiscalYear: p.fiscalYear, isYearEnd: true },
      select: { id: true, code: true, status: true, endDate: true },
    })) ??
    (await tx.nx05FiscalPeriod.findFirst({
      where: { tenantId: p.tenantId, fiscalYear: p.fiscalYear },
      orderBy: { periodNo: 'desc' },
      select: { id: true, code: true, status: true, endDate: true },
    }));
  if (!period) {
    throw new BadRequestException(`年度結帳失敗：找不到 ${p.fiscalYear} 年度的會計期間`);
  }
  if (period.status !== 'OPEN') {
    throw new BadRequestException(
      `年度結帳失敗：期間 ${period.code} 狀態為 ${period.status}，必須是開帳中才能結帳`,
    );
  }

  // 冪等：已結過就擋（不重複產生傳票）
  const done = await tx.nx05Voucher.findFirst({
    where: { tenantId: p.tenantId, sourceDocType: YEAR_END_DOC_TYPE, sourceDocId: period.id },
    select: { docNo: true },
  });
  if (done) {
    throw new BadRequestException(
      `年度結帳失敗：${p.fiscalYear} 年度已於傳票 ${done.docNo} 結帳過，不可重複執行`,
    );
  }

  // ── 步驟 1：結清損益科目 ──
  const rows = await tx.nx05GlBalance.findMany({
    where: { tenantId: p.tenantId, fiscalPeriodId: period.id },
    select: {
      accountCodeId: true,
      departmentId: true,
      closingDebit: true,
      closingCredit: true,
      accountCode: { select: { code: true, accountClass: { select: { statement: true } } } },
    },
  });

  interface CloseLine {
    accountCodeId: string;
    departmentId: string | null;
    drCr: string;
    amount: Dec;
  }
  const closeLines: CloseLine[] = [];
  let totalD = D0;
  let totalC = D0;

  for (const r of rows) {
    if (r.accountCode.accountClass?.statement !== 'PL') continue;
    const d = new PrismaNs.Decimal(r.closingDebit);
    const c = new PrismaNs.Decimal(r.closingCredit);
    if (d.equals(c)) continue; // 已無餘額

    // 反向沖平：借餘的科目用貸方沖、貸餘的科目用借方沖
    const drCr = d.greaterThan(c) ? 'C' : 'D';
    const amount = d.greaterThan(c) ? d.sub(c) : c.sub(d);
    closeLines.push({ accountCodeId: r.accountCodeId, departmentId: r.departmentId, drCr, amount });
    if (drCr === 'D') totalD = totalD.add(amount);
    else totalC = totalC.add(amount);
  }

  // 本期損益：借方多＝收入大於費用＝獲利（3202 記貸方）
  const netIncome = totalD.sub(totalC);

  if (closeLines.length === 0) {
    return {
      fiscalYear: p.fiscalYear,
      periodCode: period.code,
      plCloseVoucherNo: null,
      clsVoucherNo: null,
      netIncome: D0,
      closedAccountCount: 0,
    };
  }

  const pl3202 = await tx.nx05AccountCode.findFirst({
    where: { tenantId: p.tenantId, code: '3202' },
    select: { id: true },
  });
  if (!pl3202) {
    throw new BadRequestException('年度結帳失敗：找不到科目 3202 本期損益，請先建立科目表');
  }

  // 3202 的平衡行
  if (!netIncome.isZero()) {
    closeLines.push({
      accountCodeId: pl3202.id,
      departmentId: null,
      drCr: netIncome.isPositive() ? 'C' : 'D',
      amount: netIncome.abs(),
    });
  }

  let sumD = D0;
  let sumC = D0;
  for (const l of closeLines) {
    if (l.drCr === 'D') sumD = sumD.add(l.amount);
    else sumC = sumC.add(l.amount);
  }
  if (!sumD.equals(sumC)) {
    throw new BadRequestException(
      `年度結帳失敗：結清損益的分錄不平衡（借 ${sumD} / 貸 ${sumC}）`,
    );
  }

  const plDocNo = await allocNx05DocNo(tx, p.tenantId, 'JV', orgCode);
  const plVoucher = await tx.nx05Voucher.create({
    data: {
      tenantId: p.tenantId,
      docNo: plDocNo,
      voucherDate: period.endDate,
      fiscalPeriodId: period.id,
      sourceDocType: YEAR_END_DOC_TYPE,
      sourceDocId: period.id,
      sourceDocNo: period.code,
      origin: 'BATCH',
      summary: `${p.fiscalYear} 年度結帳：結清損益科目 → 3202 本期損益`,
      totalDebit: sumD,
      totalCredit: sumC,
      status: 'POSTED',
      postedAt: new Date(),
      postedBy: p.actorUserId,
      createdBy: p.actorUserId,
      updatedBy: p.actorUserId,
    },
    select: { id: true },
  });

  await tx.nx05VoucherLine.createMany({
    data: closeLines.map((l, i) => ({
      tenantId: p.tenantId,
      voucherId: plVoucher.id,
      lineNo: i + 1,
      drCr: l.drCr,
      accountCodeId: l.accountCodeId,
      amount: l.amount,
      departmentId: l.departmentId,
      summary: '年度結帳・結清損益',
      createdBy: p.actorUserId,
      updatedBy: p.actorUserId,
    })),
  });

  await applyToGlBalance(tx, {
    tenantId: p.tenantId,
    actorUserId: p.actorUserId,
    fiscalPeriodId: period.id,
    lines: closeLines,
  });

  // ── 步驟 2：3202 → 3201（亞羅的 CLS）──
  let clsVoucherNo: string | null = null;
  if (!netIncome.isZero()) {
    // CLS 樣板寫的是「借 3202／貸 3201」＝獲利的方向；虧損時兩行對調。
    const isLoss = netIncome.isNegative();
    const cls = await postByRule(tx, {
      tenantId: p.tenantId,
      actorUserId: p.actorUserId,
      ruleCode: 'CLS',
      voucherDate: period.endDate,
      orgCode,
      amounts: { AMOUNT: netIncome.abs() },
      origin: 'BATCH',
      summary: `${p.fiscalYear} 年度結帳：本期${isLoss ? '虧損' : '損益'}結轉累積盈餘`,
      source: { docType: YEAR_END_DOC_TYPE, docId: period.id, docNo: period.code },
      ...(isLoss
        ? { lineOverrides: { 1: { drCr: 'C' as const }, 2: { drCr: 'D' as const } } }
        : {}),
    });
    clsVoucherNo = cls.docNo;
  }

  return {
    fiscalYear: p.fiscalYear,
    periodCode: period.code,
    plCloseVoucherNo: plDocNo,
    clsVoucherNo,
    netIncome,
    closedAccountCount: closeLines.length - (netIncome.isZero() ? 0 : 1),
  };
}
