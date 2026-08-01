// apps/nx-api/test/e2e-scenarios/20-gl-post-by-rule.ts
// 總帳脊椎 B2（2026-08-01）：過帳共用能力 postByRule 的守門與正常路徑。
//   ①~⑥ 正常路徑：SO-CA 現金銷貨 5 行、借貸相等、科目由規則決定、餘額同步、每行指得回樣板
//   ⑦~⑫ 守門：已關帳期間／借貸不平衡／樣板科目未指定／缺部門／缺銀行帳戶／依設計不產生分錄的代號
//   ⑬~⑭ 特殊形狀：條件性分錄行自動略過、BK-TRF 借貸同科目跨帳戶
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Pool } from 'pg';

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

async function expectReject(label: string, fn: () => Promise<unknown>, mustInclude: string) {
  try {
    await fn();
    out.push({ 項目: label, 結果: '🔴 應該被擋卻通過了' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    out.push({
      項目: label,
      結果: msg.includes(mustInclude) ? '✅ 被擋下' : `🔴 擋了但理由不對：${msg.slice(0, 60)}`,
    });
  }
}

async function main(): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const dept = await tx.nx01Department.findFirst({ where: { tenantId: T }, select: { id: true } });
      const partner = await tx.nx01Partner.findFirst({ where: { tenantId: T }, select: { id: true } });
      const twd = await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });
      const bank = await tx.nx05BankAccount.create({
        data: {
          tenantId: T, code: 'ZTEST', bankName: '測試銀行', accountType: 'SA',
          currencyId: twd!.id, createdBy: U, updatedBy: U,
        },
        select: { id: true },
      });

      const openP = await tx.nx05FiscalPeriod.create({
        data: {
          tenantId: T, code: '9999-01', fiscalYear: 9999, periodNo: 1,
          startDate: new Date('9999-01-01'), endDate: new Date('9999-01-31'),
          status: 'OPEN', createdBy: U, updatedBy: U,
        },
        select: { id: true },
      });
      await tx.nx05FiscalPeriod.create({
        data: {
          tenantId: T, code: '9999-02', fiscalYear: 9999, periodNo: 2,
          startDate: new Date('9999-02-01'), endDate: new Date('9999-02-28'),
          status: 'CLOSED', createdBy: U, updatedBy: U,
        },
      });

      const D = new Date('9999-01-15');
      const dim = { departmentId: dept!.id, partnerId: partner!.id };

      // ── ① 正常路徑：SO-CA 現金銷貨（5 行）──
      const r = await postByRule(tx, {
        tenantId: T, actorUserId: U, ruleCode: 'SO-CA', voucherDate: D,
        amounts: { GROSS: 1050, NET: 1000, TAX: 50, COST: 600 },
        dimensions: dim,
        source: { docType: 'SO', docId: 'TEST-SO-1', docNo: 'SO-TEST-00001' },
      });
      ok('① SO-CA 現金銷貨過帳', r.lineCount === 5 && r.status === 'POSTED',
        `${r.docNo} / ${r.lineCount} 行 / 借 ${r.totalDebit} 貸 ${r.totalCredit}`);
      ok('② 借貸相等', r.totalDebit.equals(r.totalCredit), `${r.totalDebit.toString()}`);
      ok('③ 傳票號格式 JV-', r.docNo.startsWith('JV-'), r.docNo);

      const lines = await tx.nx05VoucherLine.findMany({
        where: { voucherId: r.voucherId }, orderBy: { lineNo: 'asc' },
        select: { drCr: true, amount: true, postingRuleLineId: true, accountCode: { select: { code: true } } },
      });
      ok('④ 每行都指得回分錄樣板（可稽核）', lines.every((l) => !!l.postingRuleLineId));
      ok('⑤ 科目由規則決定、非呼叫端指定',
        lines.map((l) => l.accountCode.code).join(',') === '1101,4101,2121,5101,1121',
        lines.map((l) => l.accountCode.code).join(','));

      const bal = await tx.nx05GlBalance.findMany({
        where: { tenantId: T, fiscalPeriodId: openP.id },
        select: { periodDebit: true, periodCredit: true },
      });
      const bd = bal.reduce((a, b) => a + Number(b.periodDebit), 0);
      const bc = bal.reduce((a, b) => a + Number(b.periodCredit), 0);
      ok('⑥ 科目餘額同步更新且借貸相等', bd === 1650 && bc === 1650, `借 ${bd} 貸 ${bc} / ${bal.length} 列`);

      // ── ⑦~⑫ 守門 ──
      await expectReject('⑦ 已關帳期間不得過帳',
        () => postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'SO-CA', voucherDate: new Date('9999-02-10'),
          amounts: { GROSS: 1050, NET: 1000, TAX: 50, COST: 600 }, dimensions: dim,
        }), '已關帳');

      await expectReject('⑧ 借貸不平衡擋下',
        () => postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'SO-CA', voucherDate: D,
          amounts: { GROSS: 9999, NET: 1000, TAX: 50, COST: 600 }, dimensions: dim,
        }), '借貸不平衡');

      await expectReject('⑨ 樣板科目未指定實際科目擋下',
        () => postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'EX-D', voucherDate: D,
          amounts: { NET: 1000, TAX: 50, GROSS: 1050 }, dimensions: dim,
        }), '樣板');

      await expectReject('⑩ 缺部門維度擋下',
        () => postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'SO-CA', voucherDate: D,
          amounts: { GROSS: 1050, NET: 1000, TAX: 50, COST: 600 },
          dimensions: { partnerId: partner!.id },
        }), '需要部門');

      await expectReject('⑪ 缺銀行帳戶維度擋下（同科目跨帳戶）',
        () => postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'BK-TRF', voucherDate: D,
          amounts: { AMOUNT: 50000 }, dimensions: dim,
        }), '需要銀行帳戶');

      await expectReject('⑫ 不產生分錄的代號擋下（FA-TRF）',
        () => postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'FA-TRF', voucherDate: D,
          amounts: { AMOUNT: 1 }, dimensions: dim,
        }), '沒有分錄行');

      // ── ⑬ 條件性行：SO-DLV 不給 UNPAID → 尾款那行自動不出現 ──
      const r2 = await postByRule(tx, {
        tenantId: T, actorUserId: U, ruleCode: 'SO-DLV', voucherDate: D,
        amounts: { PAID: 1050, NET: 1000, TAX: 50, COST: 600 }, dimensions: dim,
      });
      ok('⑬ 條件性分錄行（尾款未收）自動略過', r2.lineCount === 5, `${r2.lineCount} 行（樣板共 6 行）`);

      // ── ⑭ 銀行帳戶維度給了就過（BK-TRF 借貸同科目）──
      const r3 = await postByRule(tx, {
        tenantId: T, actorUserId: U, ruleCode: 'BK-TRF', voucherDate: D,
        amounts: { AMOUNT: 50000 }, dimensions: { ...dim, bankAccountId: bank.id },
      });
      ok('⑭ BK-TRF 帳戶間調撥（借貸同科目）可過帳', r3.lineCount === 2, `借 ${r3.totalDebit} 貸 ${r3.totalCredit}`);

      throw new Error('__ROLLBACK__');
    },
    { timeout: 120000 },
  ).catch((e) => {
    if (!(e instanceof Error) || e.message !== '__ROLLBACK__') throw e;
  });

  console.table(out);
  const bad = out.filter((o) => o.結果.startsWith('🔴'));
  console.log(bad.length === 0 ? '\n✅ 全數通過（交易已 rollback、DB 無殘留）' : `\n🔴 ${bad.length} 項不符預期`);
  process.exitCode = bad.length === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
