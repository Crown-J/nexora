// apps/nx-api/test/e2e-scenarios/22-gl-period-close.ts
// 總帳脊椎 B4（2026-08-01）：餘額結轉 ＋ 年度結帳。
//   ①~④ 結轉守門：上期未關帳／本期已關帳／首期沒有上一期／🔴 跨年度但損益未結清
//   ⑤~⑪ 年度結帳：結清損益 → 3202 → 3201、損益科目歸零、累積盈餘拿到本期損益、不可重複結、期間須 OPEN
//   ⑫~⑮ 結轉正常路徑 ＋ 試算表恆等式（借方合計＝貸方合計）
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Pool } from 'pg';

import { carryForwardToPeriod, closeFiscalYear } from '../../src/shared/nx05/nx05-period-close';
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
      結果: msg.includes(mustInclude) ? '✅ 被擋下' : `🔴 擋了但理由不對：${msg.slice(0, 70)}`,
    });
  }
}

async function main(): Promise<void> {
  await prisma
    .$transaction(
      async (tx) => {
        const dept = await tx.nx01Department.findFirst({ where: { tenantId: T }, select: { id: true } });
        const partner = await tx.nx01Partner.findFirst({ where: { tenantId: T }, select: { id: true } });
        const dim = { departmentId: dept!.id, partnerId: partner!.id };

        const mk = (y: number, n: number, s: string, ye = false) =>
          tx.nx05FiscalPeriod.create({
            data: {
              tenantId: T, code: `${y}-${String(n).padStart(2, '0')}`, fiscalYear: y, periodNo: n,
              startDate: new Date(`${y}-${String(n).padStart(2, '0')}-01`),
              endDate: new Date(`${y}-${String(n).padStart(2, '0')}-28`),
              status: s, isYearEnd: ye, createdBy: U, updatedBy: U,
            },
            select: { id: true, code: true },
          });

        const p11 = await mk(9998, 11, 'OPEN'); // ② 先當「最早且開帳中」的期間測「沒有上一期」
        const p12 = await mk(9998, 12, 'OPEN', true);
        const n01 = await mk(9999, 1, 'PENDING');

        // 9998-12 記一筆現金銷貨：收入 1000／稅 50／成本 600 → 本期損益 400
        await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'SO-CA', voucherDate: new Date('9998-12-15'),
          amounts: { GROSS: 1050, NET: 1000, TAX: 50, COST: 600 }, dimensions: dim,
        });

        // ── ①~④ 結轉守門 ──
        await expectReject('① 上期未關帳不得結轉',
          () => carryForwardToPeriod(tx, { tenantId: T, actorUserId: U, toPeriodCode: n01.code }),
          '尚未關帳');

        await expectReject('② 首期（沒有上一期）不得結轉',
          () => carryForwardToPeriod(tx, { tenantId: T, actorUserId: U, toPeriodCode: p11.code }),
          '沒有上一期');
        await tx.nx05FiscalPeriod.update({ where: { id: p11.id }, data: { status: 'CLOSED' } });

        // 先把 9998-12 關帳但「不做年度結帳」→ 跨年度結轉必須被擋
        await tx.nx05FiscalPeriod.update({ where: { id: p12.id }, data: { status: 'CLOSED' } });
        await expectReject('③ 🔴 跨年度但損益未結清必須擋（恆迎 28 年沒結轉的那個病）',
          () => carryForwardToPeriod(tx, { tenantId: T, actorUserId: U, toPeriodCode: n01.code }),
          '損益科目尚未結清');

        await expectReject('④ 已關帳期間不得改期初',
          () => carryForwardToPeriod(tx, { tenantId: T, actorUserId: U, toPeriodCode: p12.code }),
          '已關帳');

        // ── ⑤~⑪ 年度結帳 ──
        await expectReject('⑤ 期間非開帳中不得年度結帳',
          () => closeFiscalYear(tx, { tenantId: T, actorUserId: U, fiscalYear: 9998 }),
          '必須是開帳中');

        await tx.nx05FiscalPeriod.update({ where: { id: p12.id }, data: { status: 'OPEN' } });
        const yc = await closeFiscalYear(tx, { tenantId: T, actorUserId: U, fiscalYear: 9998 });
        ok('⑤ 年度結帳產生兩張傳票（結清損益＋結轉累積盈餘）',
          !!yc.plCloseVoucherNo && !!yc.clsVoucherNo, `${yc.plCloseVoucherNo} / ${yc.clsVoucherNo}`);
        ok('⑥ 本期損益＝收入 1000 − 成本 600 ＝ 400', Number(yc.netIncome) === 400, `${yc.netIncome}`);

        const balOf = async (code: string) => {
          const rows = await tx.nx05GlBalance.findMany({
            where: { tenantId: T, fiscalPeriodId: p12.id, accountCode: { code } },
            select: { closingDebit: true, closingCredit: true },
          });
          return rows.reduce(
            (a, r) => a + Number(r.closingDebit) - Number(r.closingCredit),
            0,
          );
        };
        ok('⑦ 銷貨收入 4101 已結清為 0', (await balOf('4101')) === 0, `${await balOf('4101')}`);
        ok('⑧ 銷貨成本 5101 已結清為 0', (await balOf('5101')) === 0, `${await balOf('5101')}`);
        ok('⑨ 本期損益 3202 結轉後為 0', (await balOf('3202')) === 0, `${await balOf('3202')}`);
        ok('⑩ 累積盈餘 3201 拿到 400（貸餘）', (await balOf('3201')) === -400, `${await balOf('3201')}`);

        await expectReject('⑪ 不可重複年度結帳',
          () => closeFiscalYear(tx, { tenantId: T, actorUserId: U, fiscalYear: 9998 }),
          '已於傳票');

        // ── ⑫~⑮ 結轉正常路徑 ＋ 試算表恆等式 ──
        const trial = await tx.nx05GlBalance.findMany({
          where: { tenantId: T, fiscalPeriodId: p12.id },
          select: { closingDebit: true, closingCredit: true },
        });
        const td = trial.reduce((a, r) => a + Number(r.closingDebit), 0);
        const tc = trial.reduce((a, r) => a + Number(r.closingCredit), 0);
        ok('⑫ 試算表恆等式：期末借方合計＝貸方合計', td === tc, `借 ${td} / 貸 ${tc}`);

        await tx.nx05FiscalPeriod.update({ where: { id: p12.id }, data: { status: 'CLOSED' } });
        const cf = await carryForwardToPeriod(tx, { tenantId: T, actorUserId: U, toPeriodCode: n01.code });
        ok('⑬ 年度結帳後跨年度結轉可過', cf.crossedFiscalYear && cf.rowCount > 0, `${cf.rowCount} 列`);

        const nextRows = await tx.nx05GlBalance.findMany({
          where: { tenantId: T, fiscalPeriodId: n01.id },
          select: {
            openingDebit: true, openingCredit: true,
            accountCode: { select: { code: true, accountClass: { select: { statement: true } } } },
          },
        });
        ok('⑭ 新年度期初只帶資產負債表科目（損益科目已歸零、不帶過來）',
          nextRows.every((r) => r.accountCode.accountClass?.statement === 'BS'),
          nextRows.map((r) => r.accountCode.code).sort().join(','));

        const od = nextRows.reduce((a, r) => a + Number(r.openingDebit), 0);
        const oc = nextRows.reduce((a, r) => a + Number(r.openingCredit), 0);
        ok('⑮ 新年度期初借貸相等（資產負債表本身要平）', od === oc, `借 ${od} / 貸 ${oc}`);

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
