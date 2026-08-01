// apps/nx-api/test/e2e-scenarios/21-gl-reverse-voucher.ts
// 總帳脊椎 B3（2026-08-01）：紅字沖銷 reverseVoucher 的正常路徑與守門。
//   ①~⑥ 正常路徑：方向全對調、金額不變、雙向查得到、原傳票維持 POSTED、餘額借貸相抵為零
//   ⑦~⑫ 守門：一張只能沖一次／沖銷傳票不可再沖／DRAFT 不可沖／未過帳不可沖／原因必填／
//        原期已關帳要指定新日期
//   ⑬~⑭ DRAFT 作廢：POSTED 不可作廢、DRAFT 作廢後為 VOIDED
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Pool } from 'pg';

import { postByRule } from '../../src/shared/nx05/nx05-post-by-rule';
import {
  discardDraftVoucher,
  findReversalOf,
  reverseVoucher,
} from '../../src/shared/nx05/nx05-reverse-voucher';

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
            tenantId: T, code: '9999-03', fiscalYear: 9999, periodNo: 3,
            startDate: new Date('9999-03-01'), endDate: new Date('9999-03-31'),
            status: 'OPEN', createdBy: U, updatedBy: U,
          },
        });

        const D = new Date('9999-01-15');
        const AMT = { GROSS: 1050, NET: 1000, TAX: 50, COST: 600 };

        // ── 原傳票 ──
        const v = await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'SO-CA', voucherDate: D,
          amounts: AMT, dimensions: dim,
          source: { docType: 'SO', docId: 'TEST-SO-9', docNo: 'SO-TEST-00009' },
        });

        // ── ①~⑥ 正常沖銷 ──
        const rv = await reverseVoucher(tx, {
          tenantId: T, actorUserId: U, voucherId: v.voucherId, reason: '客戶取消交易，測試沖銷',
        });
        ok('① 沖銷傳票產生', rv.lineCount === 5, `${rv.docNo} / ${rv.lineCount} 行`);
        ok('② 沖銷金額與原傳票相同', rv.totalDebit.equals(v.totalDebit), `${rv.totalDebit}`);

        const oL = await tx.nx05VoucherLine.findMany({
          where: { voucherId: v.voucherId }, orderBy: { lineNo: 'asc' },
          select: { lineNo: true, drCr: true, amount: true, accountCodeId: true },
        });
        const rL = await tx.nx05VoucherLine.findMany({
          where: { voucherId: rv.reversalVoucherId }, orderBy: { lineNo: 'asc' },
          select: { lineNo: true, drCr: true, amount: true, accountCodeId: true },
        });
        ok('③ 每一行借貸都對調、科目與金額不變',
          oL.length === rL.length &&
            oL.every((o, i) =>
              rL[i]!.drCr !== o.drCr &&
              rL[i]!.accountCodeId === o.accountCodeId &&
              Number(rL[i]!.amount) === Number(o.amount)),
          oL.map((o, i) => `${o.drCr}→${rL[i]!.drCr}`).join(' '));

        const back = await findReversalOf(tx, T, v.voucherId);
        ok('④ 從原傳票查得到沖銷它的那一張', back?.id === rv.reversalVoucherId, back?.docNo ?? '(無)');

        const originAfter = await tx.nx05Voucher.findFirst({
          where: { id: v.voucherId }, select: { status: true },
        });
        ok('⑤ 🔴 原傳票維持 POSTED（不改 VOIDED，否則帳面會憑空少一筆）',
          originAfter?.status === 'POSTED', originAfter?.status ?? '');

        const bal = await tx.nx05GlBalance.findMany({
          where: { tenantId: T, fiscalPeriodId: openP.id },
          select: { periodDebit: true, periodCredit: true },
        });
        const net = bal.reduce((a, b) => a + (Number(b.periodDebit) - Number(b.periodCredit)), 0);
        const gross = bal.reduce((a, b) => a + Number(b.periodDebit) + Number(b.periodCredit), 0);
        // 一張傳票的借貸總額＝1650(借)+1650(貸)=3300；原傳票＋沖銷傳票共 6600。
        // 淨額為 0＝相抵；總額仍是 6600＝兩張都留在帳上看得見（沖銷是一筆，不是把原始數字擦掉）。
        ok('⑥ 餘額借貸相抵為零、但總額看得見（沖銷是一筆、不是擦掉）',
          net === 0 && gross === 6600, `淨額 ${net} / 借貸總額 ${gross}`);

        // ── ⑦~⑫ 守門 ──
        await expectReject('⑦ 同一張不可沖銷兩次',
          () => reverseVoucher(tx, { tenantId: T, actorUserId: U, voucherId: v.voucherId, reason: '再沖一次' }),
          '只能被沖銷一次');

        await expectReject('⑧ 沖銷傳票不可再被沖銷',
          () => reverseVoucher(tx, {
            tenantId: T, actorUserId: U, voucherId: rv.reversalVoucherId, reason: '沖銷沖銷單',
          }), '本身就是一張沖銷傳票');

        await expectReject('⑨ 沖銷原因必填',
          () => reverseVoucher(tx, { tenantId: T, actorUserId: U, voucherId: v.voucherId, reason: '   ' }),
          '必須填寫沖銷原因');

        const draft = await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'SO-CA', voucherDate: D,
          amounts: AMT, dimensions: dim, autoPost: false,
        });
        await expectReject('⑩ DRAFT 傳票不可沖銷（要走作廢）',
          () => reverseVoucher(tx, { tenantId: T, actorUserId: U, voucherId: draft.voucherId, reason: 'x' }),
          '請走作廢');

        // 原期關帳後：沿用原日期會被擋、指定開帳中期間的日期則可過
        const v2 = await postByRule(tx, {
          tenantId: T, actorUserId: U, ruleCode: 'SO-CA', voucherDate: D, amounts: AMT, dimensions: dim,
        });
        await tx.nx05FiscalPeriod.update({ where: { id: openP.id }, data: { status: 'CLOSED' } });

        await expectReject('⑪ 原期已關帳、沿用原日期沖銷被擋（並指出要給新日期）',
          () => reverseVoucher(tx, { tenantId: T, actorUserId: U, voucherId: v2.voucherId, reason: '關帳後更正' }),
          '請指定 reversalDate');

        const rv2 = await reverseVoucher(tx, {
          tenantId: T, actorUserId: U, voucherId: v2.voucherId, reason: '關帳後更正',
          reversalDate: new Date('9999-03-10'),
        });
        ok('⑫ 指定開帳中期間的日期即可沖銷（分錄落在當期）', rv2.periodCode === '9999-03', rv2.periodCode);

        // ── ⑬~⑭ DRAFT 作廢 ──
        await expectReject('⑬ 已過帳傳票不可作廢',
          () => discardDraftVoucher(tx, {
            tenantId: T, actorUserId: U, voucherId: v.voucherId, reason: '想直接作廢',
          }), '只能走紅字沖銷');

        await discardDraftVoucher(tx, {
          tenantId: T, actorUserId: U, voucherId: draft.voucherId, reason: '打錯了、還沒過帳',
        });
        const draftAfter = await tx.nx05Voucher.findFirst({
          where: { id: draft.voucherId }, select: { status: true },
        });
        ok('⑭ DRAFT 作廢後為 VOIDED（VOIDED 的正確語意）', draftAfter?.status === 'VOIDED', draftAfter?.status ?? '');

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
