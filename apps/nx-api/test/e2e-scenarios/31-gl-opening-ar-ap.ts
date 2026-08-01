// apps/nx-api/test/e2e-scenarios/31-gl-opening-ar-ap.ts
// 總帳脊椎 C7（2026-08-01）：期初應收／期初應付開帳。
//   ①    大聲報錯而不是悄悄跳過：沒有會計期間
//   ②~④ 應收開帳：每個往來對象一張傳票 / 廠商退款應收走其他應收款 / 開帳日之後的收款要加回去
//   ⑤   擋重複
//   ⑥   應付開帳：借期初承接權益、貸應付帳款
//   ⑦~⑨ 🔴 對帳表：應收、廠商退款應收、應付三項全部收斂到 0
//   ⑩   🔴 三種期初一起做完 → 資產負債表左邊三大塊（存貨／應收／應付）全部對得起來
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';
import { Pool } from 'pg';

import { reconcileGl } from '../../src/shared/nx05/nx05-gl-reconcile';
import {
  postOpeningPayable,
  postOpeningReceivable,
} from '../../src/shared/nx05/nx05-post-opening-ar-ap';
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
async function expectThrow(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return '（沒有報錯）';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

async function main(): Promise<void> {
  await prisma
    .$transaction(
      async (tx) => {
        const OPEN = new Date('9992-06-15');
        const twd = await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });
        const customer = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: 'C' }, select: { id: true, name: true },
        });
        const supplier = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: { in: ['S', 'V', 'O'] } }, select: { id: true },
        });

        // ── ① 沒有會計期間 ──
        const m1 = await expectThrow(() =>
          postOpeningReceivable(tx, { tenantId: T, openingDate: OPEN, userId: U }),
        );
        ok('① 沒有開帳中的會計期間 → 大聲報錯（⛔ 不是悄悄跳過）',
          m1.includes('沒有開帳中的會計期間'), m1.slice(0, 34));

        await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: '9992-06', fiscalYear: 9992, periodNo: 6,
            startDate: new Date('9992-06-01'), endDate: new Date('9992-06-30'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
        });

        // 造一筆「廠商退款應收」（進貨退出建的），驗它會走其他應收款而不是應收帳款
        const prAr = await tx.nx05ArLedger.create({
          data: {
            tenantId: T, docNo: 'AR-TEST-OPEN-90001', sourceType: 'PR',
            customerId: supplier!.id, arDate: new Date('9992-05-20'),
            dueDate: new Date('9992-06-20'), currencyId: twd!.id,
            originalAmount: new PrismaNs.Decimal(3000),
            paidAmount: new PrismaNs.Decimal(0),
            balanceAmount: new PrismaNs.Decimal(3000),
            status: 'OPEN', createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });

        // 造一筆「開帳日之後才收的款」——餘額欄已經被它扣過，期初必須加回去
        const lateAr = await tx.nx05ArLedger.create({
          data: {
            tenantId: T, docNo: 'AR-TEST-OPEN-90002', sourceType: 'SO',
            customerId: customer!.id, arDate: new Date('9992-05-25'),
            dueDate: new Date('9992-06-25'), currencyId: twd!.id,
            originalAmount: new PrismaNs.Decimal(5000),
            paidAmount: new PrismaNs.Decimal(2000),
            balanceAmount: new PrismaNs.Decimal(3000),
            status: 'PARTIAL', createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });
        await tx.nx05Paylog.create({
          data: {
            tenantId: T, docNo: 'RC-TEST-OPEN-90001', payType: 'CR',
            payDate: new Date('9992-06-20'), // 開帳日之後
            partnerId: customer!.id, arId: lateAr.id, currencyId: twd!.id,
            amount: new PrismaNs.Decimal(2000), status: 'POSTED',
            createdBy: U, updatedBy: U,
          },
        });

        // ── ②~④ 應收開帳 ──
        const arExpected = await tx.nx05ArLedger.aggregate({
          where: { tenantId: T, status: { notIn: ['WRITTEN_OFF'] }, arDate: { lte: OPEN } },
          _sum: { balanceAmount: true },
        });
        const r = await postOpeningReceivable(tx, { tenantId: T, openingDate: OPEN, userId: U });
        ok('② 每個往來對象一張傳票（應收本來就是掛在對象身上的）',
          r.lines.length >= 2, `${r.lines.length} 張`);

        const prLine = r.lines.find((l) => l.partnerId === supplier!.id)!;
        const l2 = await tx.nx05VoucherLine.findMany({
          where: { voucherId: prLine.voucherId }, orderBy: { lineNo: 'asc' },
          select: { drCr: true, amount: true, accountCode: { select: { code: true } } },
        });
        ok('③ 🔴 廠商退款應收走「其他應收款」，⛔ 不是跟客戶欠款混在應收帳款',
          l2.map((l) => `${l.drCr}${l.accountCode.code}${Number(l.amount)}`).join(',') ===
            'D11133000,C31033000',
          l2.map((l) => `${l.drCr}${l.accountCode.code}${Number(l.amount)}`).join(','));

        // 期初總額 = 未收餘額合計 + 開帳日之後那筆收款 2000
        const expectAr = new PrismaNs.Decimal(arExpected._sum.balanceAmount ?? 0).add(2000);
        ok('④ 🔴 開帳日之後才收的款要加回去（那筆收款自己會有傳票、不能重複扣）',
          r.totalAmount.equals(expectAr),
          `${r.totalAmount.toString()}（餘額 ${arExpected._sum.balanceAmount} ＋ 之後收款 2000）`);

        // ── ⑤ 擋重複 ──
        const m2 = await expectThrow(() =>
          postOpeningReceivable(tx, { tenantId: T, openingDate: OPEN, userId: U }),
        );
        ok('⑤ 應收開帳只能做一次', m2.includes('已經做過了'), m2.slice(0, 26));

        // ── ⑥ 應付開帳 ──
        await tx.nx05ApLedger.create({
          data: {
            tenantId: T, docNo: 'AP-TEST-OPEN-90001', sourceType: 'RR',
            supplierId: supplier!.id, apDate: new Date('9992-05-18'),
            dueDate: new Date('9992-06-18'), currencyId: twd!.id,
            originalAmount: new PrismaNs.Decimal(8000),
            paidAmount: new PrismaNs.Decimal(0),
            balanceAmount: new PrismaNs.Decimal(8000),
            status: 'OPEN', createdBy: U, updatedBy: U,
          },
        });
        const rp = await postOpeningPayable(tx, { tenantId: T, openingDate: OPEN, userId: U });
        const l6 = await tx.nx05VoucherLine.findMany({
          where: { voucherId: rp.lines[0]!.voucherId }, orderBy: { lineNo: 'asc' },
          select: { drCr: true, amount: true, accountCode: { select: { code: true } } },
        });
        ok('⑥ 應付開帳＝借期初承接權益、貸應付帳款（承接進來的負債也掛同一格）',
          l6.map((l) => `${l.drCr}${l.accountCode.code}${Number(l.amount)}`).join(',') ===
            'D31038000,C21018000',
          l6.map((l) => `${l.drCr}${l.accountCode.code}${Number(l.amount)}`).join(','));

        // ── ⑦~⑩ 🔴 對帳表 ──
        // 期初存貨也做掉，才看得出「資產負債表左邊三大塊」的完整樣子
        const sites = await tx.nx01Site.findMany({
          where: { tenantId: T }, select: { id: true, code: true, name: true },
        });
        for (const s of sites) {
          const d = await tx.nx01Department.create({
            data: { tenantId: T, code: `CC-O-${s.code}`, name: `${s.name}成本中心`, createdBy: U, updatedBy: U },
            select: { id: true },
          });
          await tx.nx01Site.update({
            where: { id: s.id }, data: { costCenterDeptId: d.id, updatedBy: U },
          });
        }
        await postOpeningInventory(tx, { tenantId: T, openingDate: OPEN, userId: U });

        const recon = await reconcileGl(tx, { tenantId: T, periodCode: '9992-06' });
        const get = (c: string) => recon.checks.find((x) => x.code === c)!;
        // 🔴 這裡刻意留了一筆「開帳日之後、但還沒接進總帳的收款 2000」。
        //    總帳記的是開帳當天的餘額（含那 2000）、子帳餘額則已經被那筆收款扣掉了
        //    → 對帳表應該剛好差 2000。⭐ 那正是「收付款尚未接上總帳」這個缺口的形狀，
        //    這一項在驗的是：對帳表抓得到它，而且差額**剛好**是那筆金額、不多不少。
        ok('⑦ 🔴 應收的差額剛好＝開帳後還沒接進總帳的收款（2000），不多不少',
          get('C1').difference.abs().equals(new PrismaNs.Decimal(2000)),
          `差額 ${get('C1').difference.toString()}`);
        ok('⑧ 🔴 「總帳其他應收款 ＝ 廠商退款應收」收斂到 0',
          get('C1b').passed, `差額 ${get('C1b').difference.toString()}`);
        ok('⑨ 🔴 「總帳應付帳款 ＝ 應付子帳」收斂到 0',
          get('C2').passed, `差額 ${get('C2').difference.toString()}`);
        ok('⑩ ⭐ 存貨／廠商退款應收／應付三項收斂到 0，應收剩下的差額也完全解釋得了',
          get('C1b').passed && get('C2').passed && get('C3').passed &&
            get('C1').difference.abs().equals(new PrismaNs.Decimal(2000)),
          `存貨差額 ${get('C3').difference.toString()}`);

        out.push({
          項目: '（參考）三種期初都做完之後的對帳總覽',
          結果: recon.checks
            .map((c) => `${c.code}${c.passed ? '✅' : `⚠${c.difference.toString()}`}`)
            .join(' '),
        });
        // 用掉變數（避免 lint unused）
        void prAr;

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
