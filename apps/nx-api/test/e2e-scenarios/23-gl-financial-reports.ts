// apps/nx-api/test/e2e-scenarios/23-gl-financial-reports.ts
// 總帳脊椎 B5（2026-08-01）：試算表 ＋ 損益表 ＋ 資產負債表 ＋ 現金流量分類彙總（純查詢、不建表）。
//   ①~③ 試算表：三組合計左右相等、科目彙總正確
//   ④~⑨ 損益表：收入/成本/毛利/毛利率/營業費用/營業利益/稅前/所得稅/本期淨利
//   ⑩~⑬ 資產負債表：資產＝負債＋權益，且年度結帳前要把「尚未結轉的本期損益」算進權益才會平
//   ⑰    現金流量分類彙總核對（⚠ 必須在年度結帳前跑）
//   ⑭~⑯ 年度結帳後：本期損益歸零、累積盈餘接手、資產負債表仍然平
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Pool } from 'pg';

import {
  getBalanceSheet,
  getCashFlowSummary,
  getIncomeStatement,
  getTrialBalance,
} from '../../src/shared/nx05/nx05-financial-reports';
import { closeFiscalYear } from '../../src/shared/nx05/nx05-period-close';
import { postByRule } from '../../src/shared/nx05/nx05-post-by-rule';

const T = 'NX99TANT9900004';
const U = 'NX01USER9900004';
const url = /DATABASE_URL="([^"]+)"/.exec(
  fs.readFileSync(new URL('../../../../packages/db-core/.env', import.meta.url), 'utf8'),
)![1];
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url })) });
const out: { 項目: string; 結果: string }[] = [];

function ok(label: string, cond: boolean, detail = '') {
  out.push({ 項目: label, 結果: cond ? `✅ ${detail}`.trim() : `🔴 不符預期 ${detail}` });
}

async function main(): Promise<void> {
  await prisma
    .$transaction(
      async (tx) => {
        const dept = await tx.nx01Department.findFirst({ where: { tenantId: T }, select: { id: true } });
        const partner = await tx.nx01Partner.findFirst({ where: { tenantId: T }, select: { id: true } });
        const twd = await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });
        const bank = await tx.nx05BankAccount.create({
          data: {
            tenantId: T, code: 'ZRPT', bankName: '報表測試銀行', accountType: 'SA',
            currencyId: twd!.id, createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });
        const dim = { departmentId: dept!.id, partnerId: partner!.id, bankAccountId: bank.id };

        const p12 = await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: '9998-12', fiscalYear: 9998, periodNo: 12,
            startDate: new Date('9998-12-01'), endDate: new Date('9998-12-31'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
          select: { id: true, code: true },
        });
        const D = new Date('9998-12-15');

        // 情境：先以股東出資把資產墊起來，再做一筆現金銷貨、一筆費用
        //   EQ-IN 股東出資 100,000（借 1102 銀行／貸 3101 股本）
        //   SO-CA 現金銷貨：含稅 1,050／未稅 1,000／稅 50／成本 600
        //   EX-D  費用（可扣抵）：未稅 200／稅 10／含稅 210，科目樣板 6xxx → 指定 6201 租金支出
        await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'EQ-IN', voucherDate: D,
          amounts: { AMOUNT: 100000 }, dimensions: dim,
          lineOverrides: { 3: { skip: true } }, // 無溢價 → 資本公積那行不出現
        });
        await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'SO-CA', voucherDate: D,
          amounts: { GROSS: 1050, NET: 1000, TAX: 50, COST: 600 }, dimensions: dim,
        });
        await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'EX-D', voucherDate: D,
          amounts: { NET: 200, TAX: 10, GROSS: 210 }, dimensions: dim,
          lineOverrides: { 1: { accountCode: '6201' } },
        });

        // ── ①~③ 試算表 ──
        const tb = await getTrialBalance(tx, { tenantId: T, periodCode: p12.code });
        ok('① 試算表：期初/本期/期末三組合計皆左右相等', tb.isBalanced,
          `本期 借 ${tb.totals.periodDebit} / 貸 ${tb.totals.periodCredit}`);
        ok('② 試算表列出的是科目（跨部門已合併）', tb.rows.length > 0 &&
          new Set(tb.rows.map((r) => r.accountCode)).size === tb.rows.length,
          `${tb.rows.length} 個科目`);
        const cash = tb.rows.find((r) => r.accountCode === '1101');
        ok('③ 現金 1101 本期借方＝1050（現金銷貨收訖）',
          Number(cash?.periodDebit ?? -1) === 1050, `${cash?.periodDebit}`);

        // ── ④~⑨ 損益表 ──
        const is = await getIncomeStatement(tx, { tenantId: T, periodCode: p12.code });
        ok('④ 營業收入 1000', Number(is.revenue) === 1000, `${is.revenue}`);
        ok('⑤ 營業成本 600', Number(is.cost) === 600, `${is.cost}`);
        ok('⑥ 毛利 400、毛利率 40%',
          Number(is.grossProfit) === 400 && is.grossMarginPct === 40,
          `${is.grossProfit} / ${is.grossMarginPct}%`);
        ok('⑦ 營業費用 200（租金）', Number(is.operatingExpense) === 200, `${is.operatingExpense}`);
        ok('⑧ 營業利益 200＝毛利 400 − 費用 200', Number(is.operatingIncome) === 200, `${is.operatingIncome}`);
        ok('⑨ 本期淨利 200（無業外、無所得稅）',
          Number(is.pretaxIncome) === 200 && Number(is.netIncome) === 200,
          `稅前 ${is.pretaxIncome} / 稅後 ${is.netIncome}`);

        // ── ⑩~⑬ 資產負債表（年度結帳前）──
        const bs = await getBalanceSheet(tx, { tenantId: T, periodCode: p12.code });
        ok('⑩ 🔴 資產 ＝ 負債 ＋ 權益', bs.isBalanced,
          `資產 ${bs.totalAssets} = 負債 ${bs.totalLiabilities} + 權益 ${bs.totalEquity}`);
        ok('⑪ 尚未結轉的本期損益 200 被算進權益（否則資產負債表不會平）',
          Number(bs.unclosedNetIncome) === 200, `${bs.unclosedNetIncome}`);
        ok('⑫ 權益＝股本 100000 ＋ 未結轉損益 200',
          Number(bs.totalEquityAccounts) === 100000 && Number(bs.totalEquity) === 100200,
          `科目 ${bs.totalEquityAccounts} / 合計 ${bs.totalEquity}`);
        const inv = bs.assets.find((a) => a.accountCode === '1121');
        ok('⑬ 存貨 1121 以貸餘呈現為負數（不用 abs、否則累計折舊那類科目會看起來像正資產）',
          Number(inv?.amount ?? 0) === -600, `${inv?.amount}`);

        // ── ⑰ 現金流量分類彙總（⚠ 必須在年度結帳之前跑，理由見函式註解）──
        const cf = await getCashFlowSummary(tx, { tenantId: T, periodCode: p12.code });
        ok('⑰ 現金流量分類核對相符：營業＋投資＋籌資 ＝ 現金淨變動',
          cf.isReconciled,
          `營業 ${cf.operating} / 投資 ${cf.investing} / 籌資 ${cf.financing} vs 現金 ${cf.cashMovement}`);

        // ── ⑭~⑯ 年度結帳後 ──
        const yc = await closeFiscalYear(tx, { tenantId: T, actorUserId: U, fiscalYear: 9998 });
        ok('⑭ 年度結帳本期損益 200', Number(yc.netIncome) === 200, `${yc.netIncome}`);

        const bs2 = await getBalanceSheet(tx, { tenantId: T, periodCode: p12.code });
        ok('⑮ 結帳後：未結轉損益歸零、累積盈餘接手，資產負債表仍然平',
          bs2.isBalanced && Number(bs2.unclosedNetIncome) === 0 &&
            Number(bs2.totalEquityAccounts) === 100200,
          `未結轉 ${bs2.unclosedNetIncome} / 權益科目 ${bs2.totalEquityAccounts}`);

        const is2 = await getIncomeStatement(tx, { tenantId: T, periodCode: p12.code });
        ok('⑯ 結帳後損益表全部歸零（收入與成本都已結清）',
          Number(is2.revenue) === 0 && Number(is2.cost) === 0 && Number(is2.netIncome) === 0,
          `收入 ${is2.revenue} / 淨利 ${is2.netIncome}`);

        throw new Error('__ROLLBACK__');
      },
      { timeout: 120000 },
    )
    .catch((e) => {
      if (!(e instanceof Error) || e.message !== '__ROLLBACK__') throw e;
    });

  console.table(out);
  const bad = out.filter((o) => o.結果.startsWith('🔴'));
  console.log(bad.length === 0 ? '\n✅ 全數通過（交易已 rollback、DB 無殘留）' : `\n🔴 ${bad.length} 項不符預期`);
  process.exitCode = bad.length === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
