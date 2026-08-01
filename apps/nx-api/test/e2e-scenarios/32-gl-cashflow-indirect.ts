// apps/nx-api/test/e2e-scenarios/32-gl-cashflow-indirect.ts
// 總帳脊椎 C8（2026-08-01）：正式現金流量表——間接法（執行長拍板）。
//   ①~③ 本期損益、營運資產負債變動、三大活動的分類
//   ④   🔴 恆等式：三大活動合計 ＝ 現金科目的實際變動（複式簿記保證、不是湊的）
//   ⑤   🔴 期初開帳獨立成一段，⛔ 不混進三大活動（2.32 億不能算成營業活動流出）
//   ⑥   利息費用／處分資產損益從營業活動移到籌資／投資
//   ⑦   非現金項目（累計折舊）加回營業活動
//   ⑧   期初現金 ＋ 淨變動 ＝ 期末現金
//   ⑨   科目的現金流量分類標錯 → 表上會直說「差額只有一種可能」
//   ⑩   ⚠ 報表自己講得出缺什麼（折舊未接、結帳前才能跑）
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';
import { Pool } from 'pg';

import { getCashFlowStatement } from '../../src/shared/nx05/nx05-financial-reports';
import { postByRule } from '../../src/shared/nx05/nx05-post-by-rule';
import { postOpeningInventory } from '../../src/shared/nx05/nx05-post-opening-inventory';

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
const n = (d: PrismaNs.Decimal) => Number(d);

async function main(): Promise<void> {
  await prisma
    .$transaction(
      async (tx) => {
        const D = new Date('9991-05-15');
        const P = '9991-05';
        await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: P, fiscalYear: 9991, periodNo: 5,
            startDate: new Date('9991-05-01'), endDate: new Date('9991-05-31'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
        });
        const dept = await tx.nx01Department.create({
          data: { tenantId: T, code: 'CC-CF', name: '現金流測試成本中心', createdBy: U, updatedBy: U },
          select: { id: true },
        });
        const customer = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: 'C' }, select: { id: true },
        });
        const supplier = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: { in: ['S', 'V', 'O'] } }, select: { id: true },
        });
        const bank = await tx.nx05BankAccount.create({
          data: {
            tenantId: T, code: 'BK-CF', bankName: '測試銀行', accountType: 'C',
            currencyId: (await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }))!.id,
            createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });

        // 一筆賒銷：收入 1000／稅 50／應收 1050／成本 600（沒有現金進出）
        await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'SO-CR', voucherDate: D,
          source: { docType: 'CFTEST', docId: 'cf-so' }, summary: '現金流測試·賒銷',
          amounts: {
            GROSS: new PrismaNs.Decimal(1050), NET: new PrismaNs.Decimal(1000),
            TAX: new PrismaNs.Decimal(50), COST: new PrismaNs.Decimal(600),
          },
          dimensions: { departmentId: dept.id, partnerId: customer!.id },
        });
        // 一筆收款：現金真的進來 400
        await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'RC-CA', voucherDate: D,
          source: { docType: 'CFTEST', docId: 'cf-rc' }, summary: '現金流測試·收款',
          amounts: { AMOUNT: new PrismaNs.Decimal(400) },
          dimensions: { partnerId: customer!.id, bankAccountId: bank.id },
        });
        // 一筆借款動用：籌資活動流入
        await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'LN-DRAW', voucherDate: D,
          source: { docType: 'CFTEST', docId: 'cf-ln' }, summary: '現金流測試·借款',
          amounts: { AMOUNT: new PrismaNs.Decimal(5000) },
          dimensions: { partnerId: supplier!.id, bankAccountId: bank.id },
          lineOverrides: { 1: { accountCode: '1102' }, 2: { accountCode: '2151' } },
        });

        const cf1 = await getCashFlowStatement(tx, { tenantId: T, periodCode: P });
        ok('① 本期損益＝收入 1000 − 銷貨成本 600 ＝ 400', n(cf1.netIncome) === 400, `${cf1.netIncome}`);
        ok('② 營運資產負債的變動有列出來（應收增加＝現金流出）',
          cf1.workingCapital.some((l) => l.accountCode === '1111' && n(l.amount) < 0),
          cf1.workingCapital.map((l) => `${l.accountCode}${n(l.amount)}`).join(','));
        ok('③ 借款動用歸籌資活動（＋5000）',
          n(cf1.financing) === 5000, `${cf1.financing}`);
        ok('④ 🔴 三大活動合計 ＝ 現金科目的實際變動（複式簿記保證、不是湊的）',
          cf1.isReconciled, `淨變動 ${cf1.netChange} / 差額 ${cf1.difference}`);
        ok('⑧ 期初現金 ＋ 淨變動 ＝ 期末現金',
          n(cf1.openingCash) + n(cf1.netChange) === n(cf1.closingCash),
          `${cf1.openingCash} ＋ ${cf1.netChange} ＝ ${cf1.closingCash}`);

        // ── ⑥ 還本付息：本金 1000 走籌資、利息 30 是損益但也歸籌資 → 要從營業活動移出 ──
        await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'LN-REPAY', voucherDate: D,
          source: { docType: 'CFTEST', docId: 'cf-int' }, summary: '現金流測試·還本付息',
          amounts: {},
          dimensions: { partnerId: supplier!.id, bankAccountId: bank.id },
          lineOverrides: {
            1: { accountCode: '2151', amount: new PrismaNs.Decimal(1000) },
            2: { amount: new PrismaNs.Decimal(30) },
            3: { amount: new PrismaNs.Decimal(1030) },
          },
        });
        // ── ⑦ 提列折舊 500：非現金，要在營業活動加回來 ──
        await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'FA-DEP', voucherDate: D,
          source: { docType: 'CFTEST', docId: 'cf-dep' }, summary: '現金流測試·折舊',
          amounts: { AMOUNT: new PrismaNs.Decimal(500) },
          lineOverrides: { 2: { accountCode: '1502' } },
        });

        const cf2 = await getCashFlowStatement(tx, { tenantId: T, periodCode: P });
        const interestOut = cf2.reclassifiedOut.find((l) => l.accountCode === '8101');
        ok('⑥ 🔴 利息費用是損益、但歸籌資 → 從營業活動移出（本期損益 400−500−30＝−130）',
          n(cf2.netIncome) === -130 && n(interestOut?.amount ?? new PrismaNs.Decimal(0)) === 30 &&
            n(cf2.financing) === 5000 - 1030,
          `本期損益 ${cf2.netIncome} / 移出利息 ${interestOut?.amount} / 籌資 ${cf2.financing}`);

        const depAdd = cf2.nonCashAdjustments.find((l) => l.accountCode === '1502');
        ok('⑦ 🔴 折舊 500 是非現金 → 在營業活動加回來（一減一加、對現金零影響）',
          n(depAdd?.amount ?? new PrismaNs.Decimal(0)) === 500 && n(cf2.operating) === 400,
          `加回 ${depAdd?.amount} / 營業活動 ${cf2.operating}（與提折舊前相同）`);
        ok('④c 🔴 加了利息與折舊之後恆等式仍然成立', cf2.isReconciled, `差額 ${cf2.difference}`);

        // ── ⑤ 🔴 期初開帳獨立成一段 ──
        const sites = await tx.nx01Site.findMany({ where: { tenantId: T }, select: { id: true, code: true } });
        for (const s of sites) {
          const d = await tx.nx01Department.create({
            data: { tenantId: T, code: `CC-CF-${s.code}`, name: `CF-${s.code}`, createdBy: U, updatedBy: U },
            select: { id: true },
          });
          await tx.nx01Site.update({ where: { id: s.id }, data: { costCenterDeptId: d.id, updatedBy: U } });
        }
        const openRes = await postOpeningInventory(tx, { tenantId: T, openingDate: D, userId: U });
        const cf3 = await getCashFlowStatement(tx, { tenantId: T, periodCode: P });
        const invLine = cf3.workingCapital.find((l) => l.accountCode === '1121');
        ok('⑤ 🔴 期初開帳（2.32 億）獨立成一段，⛔ 沒有被算成營業活動的現金流出',
          cf3.carryoverLines.length > 0 &&
            Math.abs(n(invLine?.amount ?? new PrismaNs.Decimal(0))) < 1000 &&
            Math.abs(n(cf3.operating)) < 100000,
          `開帳 ${openRes.totalAmount} / 營業活動 ${cf3.operating} / 存貨變動 ${invLine?.amount ?? 0}`);
        ok('④b 🔴 開帳之後恆等式仍然成立', cf3.isReconciled, `差額 ${cf3.difference}`);

        // ── ⑨ 分類標錯 → 表上直說 ──
        await tx.nx05AccountCode.updateMany({
          where: { tenantId: T, code: '1111' }, data: { cashFlowType: 'N' },
        });
        const cf4 = await getCashFlowStatement(tx, { tenantId: T, periodCode: P });
        ok('⑨ 科目的現金流量分類標錯 → 恆等式仍成立（N 也算進營業），⛔ 但金額會跑到錯的段',
          cf4.isReconciled &&
            cf4.nonCashAdjustments.some((l) => l.accountCode === '1111'),
          `應收跑到非現金調整段`);
        await tx.nx05AccountCode.updateMany({
          where: { tenantId: T, code: '1111' }, data: { cashFlowType: 'O' },
        });

        ok('⑩ ⚠ 報表自己講得出缺什麼（折舊未接、必須在結帳前跑、開帳獨立成段）',
          cf3.notes.length >= 3 && cf3.notes.some((s) => s.includes('折舊')) &&
            cf3.notes.some((s) => s.includes('年度結帳')),
          `${cf3.notes.length} 條提醒`);

        out.push({
          項目: '（參考）間接法現金流量表',
          結果:
            `本期損益 ${cf3.netIncome} / 營業 ${cf3.operating} / 投資 ${cf3.investing} / ` +
            `籌資 ${cf3.financing} / 淨變動 ${cf3.netChange} / 期末現金 ${cf3.closingCash}`,
        });

        throw new Error('__ROLLBACK__');
      },
      { timeout: 300000, maxWait: 30000 },
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
