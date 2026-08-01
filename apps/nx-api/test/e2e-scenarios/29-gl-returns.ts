// apps/nx-api/test/e2e-scenarios/29-gl-returns.ts
// 總帳脊椎 C4（2026-08-01）：退貨三條路接上總帳——進貨退出／進貨折讓／銷貨退回。
//   ①~④ 進貨退出：安全閘 / 走「借其他應收款」不是沖應付 / 金額對不上就 skip / 保固路徑 skip
//   ⑤   進貨折讓：沖銷應付、⛔ 存貨不動
//   ⑥~⑧ 銷貨退回：折抵走沖減應收 / 🔴 退現金走其他應付款 / 壞品不入庫時結轉成本兩行不出現
//   ⑨~⑩ 冪等、🔴 退現金確實落在負債側（應收沒有被憑空減少）
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';
import { Pool } from 'pg';

import { postPrToGl, postSrToGl } from '../../src/shared/nx05/nx05-post-return-to-gl';

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
        const wh = await tx.nx01Warehouse.findFirst({
          where: { tenantId: T }, select: { id: true, siteId: true },
        });
        const supplier = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: { in: ['S', 'V', 'O'] } }, select: { id: true },
        });
        const customer = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: 'C' }, select: { id: true },
        });
        const part = await tx.nx01Part.findFirst({ where: { tenantId: T }, select: { id: true } });
        const loc = await tx.nx01Location.findFirst({
          where: { tenantId: T, warehouseId: wh!.id }, select: { id: true },
        });
        const twd = await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });

        const cc = await tx.nx01Department.create({
          data: { tenantId: T, code: 'CC-TEST-RET', name: '測試退貨成本中心', createdBy: U, updatedBy: U },
          select: { id: true },
        });
        await tx.nx01Site.update({
          where: { id: wh!.siteId }, data: { costCenterDeptId: cc.id, updatedBy: U },
        });

        const D = new Date('9994-08-15');
        const mkLedger = async (o: {
          module: string; docType: string; docId: string; dir: 'I' | 'O'; amount: number;
        }) =>
          tx.nx03StockLedger.create({
            data: {
              tenantId: T, movementDate: D, partId: part!.id, warehouseId: wh!.id, locationId: loc!.id,
              movementType: o.dir,
              qtyIn: new PrismaNs.Decimal(o.dir === 'I' ? 5 : 0),
              qtyOut: new PrismaNs.Decimal(o.dir === 'O' ? 5 : 0),
              unitCost: new PrismaNs.Decimal(o.amount / 5),
              totalCost: new PrismaNs.Decimal(o.amount),
              balanceQty: new PrismaNs.Decimal(5), balanceCost: new PrismaNs.Decimal(o.amount / 5),
              sourceModule: o.module, sourceDocType: o.docType, sourceDocId: o.docId,
            },
          });

        const mkPr = async (
          docNo: string, o: { sub: number; tax: number; mode: string; flag?: string },
        ) =>
          tx.nx02Pr.create({
            data: {
              tenantId: T, docNo, prDate: D, supplierId: supplier!.id, warehouseId: wh!.id,
              currencyId: twd!.id, status: 'P', returnMode: o.mode,
              ...(o.flag ? { dispositionFlag: o.flag } : {}),
              subtotal: new PrismaNs.Decimal(o.sub),
              taxRate: new PrismaNs.Decimal(5),
              taxAmount: new PrismaNs.Decimal(o.tax),
              totalAmount: new PrismaNs.Decimal(o.sub + o.tax),
              createdBy: U, updatedBy: U,
            },
            select: { id: true },
          });

        const codesOf = async (vid: string | null) => {
          const ls = await tx.nx05VoucherLine.findMany({
            where: { voucherId: vid ?? '' }, orderBy: { lineNo: 'asc' },
            select: { drCr: true, amount: true, accountCode: { select: { code: true } } },
          });
          return ls.map((l) => `${l.drCr}${l.accountCode.code}${Number(l.amount)}`).join(',');
        };

        // ── ① 安全閘 ──
        const pr1 = await mkPr('PR-TEST-HQ0-90001', { sub: 1000, tax: 50, mode: 'F' });
        await mkLedger({ module: 'NX02', docType: 'R', docId: pr1.id, dir: 'O', amount: 1000 });
        const r0 = await postPrToGl(tx, { tenantId: T, prId: pr1.id, userId: U });
        ok('① 沒有開帳中的會計期間 → skip、不擋退貨流程', r0.skipped === 'NO_OPEN_PERIOD', `${r0.skipped}`);

        const period = await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: '9994-08', fiscalYear: 9994, periodNo: 8,
            startDate: new Date('9994-08-01'), endDate: new Date('9994-08-31'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });

        // ── ②~④ 進貨退出 ──
        const r1 = await postPrToGl(tx, { tenantId: T, prId: pr1.id, userId: U });
        const c1 = await codesOf(r1.voucherId);
        ok('② 🔴 進貨退出走「借其他應收款」（廠商欠我方退款）、⛔ 沒有沖抵應付那一行',
          r1.ruleCode === 'PR' && c1 === 'C11211000,C113350,D11131050', c1);

        const pr2 = await mkPr('PR-TEST-HQ0-90002', { sub: 800, tax: 40, mode: 'F' });
        await mkLedger({ module: 'NX02', docType: 'R', docId: pr2.id, dir: 'O', amount: 700 });
        const r2 = await postPrToGl(tx, { tenantId: T, prId: pr2.id, userId: U });
        ok('③ 單據金額 ≠ 實際退出去的庫存金額 → skip（同短交那條原則）',
          r2.skipped === 'AMOUNT_MISMATCH', `${r2.skipped}`);

        const pr3 = await mkPr('PR-TEST-HQ0-90003', { sub: 500, tax: 25, mode: 'F', flag: 'W' });
        await mkLedger({ module: 'NX02', docType: 'R', docId: pr3.id, dir: 'O', amount: 500 });
        const r3 = await postPrToGl(tx, { tenantId: T, prId: pr3.id, userId: U });
        ok('④ 走保固模式的退出 → skip（不建應收、由保固索賠另外處理，不憑空多一筆）',
          r3.skipped === 'WARRANTY_ROUTE', `${r3.skipped}`);

        // ── ⑤ 進貨折讓（貨不退）──
        const pr4 = await mkPr('PR-TEST-HQ0-90004', { sub: 600, tax: 30, mode: 'A' });
        const r4 = await postPrToGl(tx, { tenantId: T, prId: pr4.id, userId: U });
        const c4 = await codesOf(r4.voucherId);
        ok('⑤ 進貨折讓 → 沖銷應付、貸進貨折讓，⛔ 存貨完全不動（貨沒退、只是降價）',
          r4.ruleCode === 'PD' && c4 === 'D2101630,C5102600,C113330', c4);

        // ── ⑥~⑧ 銷貨退回 ──
        const mkSr = async (docNo: string, o: { sub: number; tax: number }) =>
          tx.nx04Sr.create({
            data: {
              tenantId: T, docNo, srDate: D, customerId: customer!.id, warehouseId: wh!.id,
              returnMethod: 'S', status: 'POSTED',
              subtotal: new PrismaNs.Decimal(o.sub),
              taxRate: new PrismaNs.Decimal(5),
              taxAmount: new PrismaNs.Decimal(o.tax),
              totalAmount: new PrismaNs.Decimal(o.sub + o.tax),
              createdBy: U, updatedBy: U,
            },
            select: { id: true, docNo: true },
          });
        // 折讓單＝系統實際記下「這筆退貨怎麼結」的地方（R 退現金／D 下次折抵）
        const mkAllowance = async (srDocNo: string, method: 'R' | 'D', amount: number) => {
          const al = await tx.nx05Allowance.create({
            data: {
              tenantId: T, docNo: `AL-TEST-${srDocNo}`, allowanceType: 'S',
              partnerId: customer!.id, allowanceDate: D,
              totalAmount: new PrismaNs.Decimal(amount),
              remark: `SR:${srDocNo} ${method === 'R' ? '退錢' : '折讓下次採購'}`,
              createdBy: U, updatedBy: U,
            },
            select: { id: true },
          });
          await tx.nx05AllowanceItem.create({
            data: {
              allowanceId: al.id, lineNo: 1, reason: '測試',
              amount: new PrismaNs.Decimal(amount), disposalMethod: method,
              createdBy: U, updatedBy: U,
            },
          });
        };

        const srD = await mkSr('SR-TEST-HQ0-90001', { sub: 2000, tax: 100 });
        await mkAllowance(srD.docNo, 'D', 2000);
        await mkLedger({ module: 'NX04', docType: 'R', docId: srD.id, dir: 'I', amount: 1200 });
        const r5 = await postSrToGl(tx, { tenantId: T, srId: srD.id, userId: U });
        const c5 = await codesOf(r5.voucherId);
        ok('⑥ 銷貨退回·下次折抵 → 沖減應收帳款',
          r5.settleMode === 'OFFSET' && c5 === 'D41022000,D2121100,C11112100,D11211200,C51011200', c5);

        const srR = await mkSr('SR-TEST-HQ0-90002', { sub: 3000, tax: 150 });
        await mkAllowance(srR.docNo, 'R', 3000);
        await mkLedger({ module: 'NX04', docType: 'R', docId: srR.id, dir: 'I', amount: 1800 });
        const r6 = await postSrToGl(tx, { tenantId: T, srId: srR.id, userId: U });
        const c6 = await codesOf(r6.voucherId);
        ok('⑦ 🔴 銷貨退回·退現金 → 記進其他應付款（欠客戶的錢），⛔ 不是沖減應收',
          r6.settleMode === 'REFUND' && c6 === 'D41023000,D2121150,D11211800,C51011800,C21423150', c6);

        const srB = await mkSr('SR-TEST-HQ0-90003', { sub: 400, tax: 20 });
        await mkAllowance(srB.docNo, 'D', 400);
        const r7 = await postSrToGl(tx, { tenantId: T, srId: srB.id, userId: U });
        const c7 = await codesOf(r7.voucherId);
        ok('⑧ 壞品不入庫（成本 0）→ 結轉成本兩行自動不出現、不是報錯',
          r7.skipped === null && c7 === 'D4102400,D212120,C1111420', c7);

        // ── ⑨~⑩ ──
        const r8 = await postSrToGl(tx, { tenantId: T, srId: srR.id, userId: U });
        ok('⑨ 冪等：同一張退貨單不會重複開傳票',
          r8.skipped === 'ALREADY_POSTED' && r8.voucherId === r6.voucherId);

        const glNet = async (code: string) => {
          const b = await tx.nx05GlBalance.findMany({
            where: { tenantId: T, fiscalPeriodId: period.id, accountCode: { code } },
            select: { closingDebit: true, closingCredit: true },
          });
          return b.reduce((s, r) => s + Number(r.closingDebit) - Number(r.closingCredit), 0);
        };
        // 折抵 2100 + 壞品 420 沖減應收；退現金 3150 落在負債，⛔ 不碰應收
        ok('⑩ 🔴 退現金那筆落在負債側（其他應付款 -3150＝貸餘）、應收只被折抵那兩筆減少（-2520）',
          (await glNet('2142')) === -3150 && (await glNet('1111')) === -2520,
          `其他應付款 ${await glNet('2142')} / 應收 ${await glNet('1111')}`);

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
