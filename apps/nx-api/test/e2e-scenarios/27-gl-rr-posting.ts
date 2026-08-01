// apps/nx-api/test/e2e-scenarios/27-gl-rr-posting.ts
// 總帳脊椎 C2（2026-08-01）：進貨驗收接上總帳——進貨單過帳 → 自動產生分錄。
//   ①    安全閘：沒有開帳中的會計期間就 skip（不擋進貨流程）
//   ②~⑥ 採購進貨正常路徑：交易代號 PO、分錄 3 行、金額對得上單據、維度齊、冪等
//   ⑦   同行調貨進貨 → 交易代號改用 PO-TR（報表要切得出「調貨佔多少」）
//   ⑧   國外進貨 → skip（進口費用已攤進存貨、應付只有貨款，借貸兜不起來）
//   ⑨   短交（單據金額 ≠ 實際入庫金額）→ skip，⛔ 不替營運端的資料矛盾圓場
//   ⑩   沒有入庫流水 → skip
//   ⑪~⑫ 🔴 子帳 vs 總帳：存貨對得上庫存流水、應付對得上應付子帳
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';
import { Pool } from 'pg';

import { postRrToGl } from '../../src/shared/nx05/nx05-post-rr-to-gl';
import { postSoToGl } from '../../src/shared/nx05/nx05-post-so-to-gl';

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
        const part = await tx.nx01Part.findFirst({ where: { tenantId: T }, select: { id: true } });
        const loc = await tx.nx01Location.findFirst({
          where: { tenantId: T, warehouseId: wh!.id }, select: { id: true },
        });
        // ⚠ 幣別必須給真 ID：nx02_rr.currency_id 的 @default("TWD") 是壞的（全庫 13 處同樣寫法）
        const twd = await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });

        // 據點設一個成本中心，驗證庫存類單據（單上沒有業務員）也拿得到成本中心
        const siteDept = await tx.nx01Department.create({
          data: { tenantId: T, code: 'CC-TEST-RR', name: '測試進貨成本中心', createdBy: U, updatedBy: U },
          select: { id: true },
        });
        await tx.nx01Site.update({
          where: { id: wh!.siteId }, data: { costCenterDeptId: siteDept.id, updatedBy: U },
        });

        const D = new Date('9996-10-15');
        // 進貨單：未稅 2000／稅 100／含稅 2100
        const mkRr = async (
          docNo: string,
          o: { sub: number; tax: number; tiId?: string | null; poId?: string | null } ,
        ) =>
          tx.nx02Rr.create({
            data: {
              tenantId: T, docNo, rrDate: D, supplierId: supplier!.id, warehouseId: wh!.id,
              currencyId: twd!.id, status: 'POSTED',
              subtotal: new PrismaNs.Decimal(o.sub),
              taxRate: new PrismaNs.Decimal(5),
              taxAmount: new PrismaNs.Decimal(o.tax),
              totalAmount: new PrismaNs.Decimal(o.sub + o.tax),
              tiId: o.tiId ?? null, poId: o.poId ?? null,
              createdBy: U, updatedBy: U,
            },
            select: { id: true, docNo: true },
          });

        // 造入庫流水（模擬 applyRrPosting 的產物）
        const mkStockIn = async (rrId: string, docType: 'P' | 'G', amount: number) =>
          tx.nx03StockLedger.create({
            data: {
              tenantId: T, movementDate: D, partId: part!.id, warehouseId: wh!.id, locationId: loc!.id,
              movementType: 'I',
              qtyIn: new PrismaNs.Decimal(10), qtyOut: new PrismaNs.Decimal(0),
              unitCost: new PrismaNs.Decimal(amount / 10),
              totalCost: new PrismaNs.Decimal(amount),
              balanceQty: new PrismaNs.Decimal(10), balanceCost: new PrismaNs.Decimal(amount / 10),
              sourceModule: 'NX02', sourceDocType: docType, sourceDocId: rrId,
            },
          });

        // ── ① 安全閘：還沒有會計期間 ──
        const rr1 = await mkRr('RR-TEST-HQ0-90001', { sub: 2000, tax: 100 });
        await mkStockIn(rr1.id, 'P', 2000);
        const r0 = await postRrToGl(tx, { tenantId: T, rrId: rr1.id, userId: U });
        ok('① 沒有開帳中的會計期間 → skip、不擋進貨流程',
          r0.skipped === 'NO_OPEN_PERIOD' && !r0.voucherId, `${r0.skipped}`);

        const period = await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: '9996-10', fiscalYear: 9996, periodNo: 10,
            startDate: new Date('9996-10-01'), endDate: new Date('9996-10-31'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });

        // ── ②~⑥ 採購進貨正常路徑 ──
        const r1 = await postRrToGl(tx, { tenantId: T, rrId: rr1.id, userId: U });
        ok('② 啟用總帳後自動產生傳票、交易代號＝PO 進貨',
          !!r1.voucherId && r1.skipped === null && r1.ruleCode === 'PO', `${r1.docNo}`);

        const lines = await tx.nx05VoucherLine.findMany({
          where: { voucherId: r1.voucherId! }, orderBy: { lineNo: 'asc' },
          select: {
            drCr: true, amount: true, departmentId: true, partnerId: true,
            accountCode: { select: { code: true } },
          },
        });
        ok('③ 分錄 3 行、科目由規則決定（呼叫端沒指定任何科目）',
          lines.map((l) => `${l.drCr}${l.accountCode.code}`).join(',') === 'D1121,D1133,C2101',
          lines.map((l) => `${l.drCr}${l.accountCode.code}`).join(','));
        ok('④ 存貨 2000／進項稅 100／應付 2100 皆對得上進貨單',
          Number(lines[0]!.amount) === 2000 && Number(lines[1]!.amount) === 100 &&
            Number(lines[2]!.amount) === 2100,
          lines.map((l) => Number(l.amount)).join('/'));
        ok('⑤ 存貨帶著成本中心（來自收貨倉的據點，不是人）、應付帶著往來對象',
          lines[0]!.departmentId === siteDept.id && !!lines[2]!.partnerId &&
            r1.costCenterSource === 'SITE',
          `${r1.costCenterSource}`);

        const r2 = await postRrToGl(tx, { tenantId: T, rrId: rr1.id, userId: U });
        ok('⑥ 冪等：同一張進貨單再過一次不會重複開傳票',
          r2.skipped === 'ALREADY_POSTED' && r2.voucherId === r1.voucherId);

        // ── ⑦ 同行調貨進貨 → PO-TR ──
        const ti = await tx.nx02Ti.create({
          data: {
            tenantId: T, docNo: 'TI-TEST-HQ0-90001', tiDate: D, partnerId: supplier!.id,
            warehouseId: wh!.id, currencyId: twd!.id, status: 'C',
            taxRate: new PrismaNs.Decimal(5), createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });
        const rr2 = await mkRr('RR-TEST-HQ0-90002', { sub: 500, tax: 25, tiId: ti.id });
        await mkStockIn(rr2.id, 'G', 500);
        const r3 = await postRrToGl(tx, { tenantId: T, rrId: rr2.id, userId: U });
        ok('⑦ 同行調貨進貨 → 交易代號改用 PO-TR（報表切得出「調貨佔多少」）',
          r3.ruleCode === 'PO-TR' && r3.skipped === null, `${r3.ruleCode}`);

        // ── ⑧ 國外進貨 → skip ──
        const po = await tx.nx02Po.create({
          data: {
            tenantId: T, docNo: 'PO-TEST-HQ0-90001', poDate: D, supplierId: supplier!.id,
            currencyId: twd!.id, status: 'CONFIRMED',
            taxRate: new PrismaNs.Decimal(5), createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });
        const rr3 = await mkRr('RR-TEST-HQ0-90003', { sub: 1000, tax: 50, poId: po.id });
        await mkStockIn(rr3.id, 'P', 1000);
        await tx.nx02RrImport.create({
          data: {
            tenantId: T, rrId: rr3.id, poId: po.id, currencyId: twd!.id,
            totalImportCost: new PrismaNs.Decimal(300),
            exchangeRate: new PrismaNs.Decimal(1),
            createdBy: U, updatedBy: U,
          },
        });
        const r4 = await postRrToGl(tx, { tenantId: T, rrId: rr3.id, userId: U });
        ok('⑧ 國外進貨 → skip（進口費用已攤進存貨、應付只有貨款，借貸兜不起來）',
          r4.skipped === 'IMPORT_NOT_SUPPORTED', `${r4.skipped}`);

        // ── ⑨ 短交：單據金額 2000、實際只入庫 1800 ──
        const rr4 = await mkRr('RR-TEST-HQ0-90004', { sub: 2000, tax: 100 });
        await mkStockIn(rr4.id, 'P', 1800);
        const r5 = await postRrToGl(tx, { tenantId: T, rrId: rr4.id, userId: U });
        ok('⑨ 🔴 單據金額 ≠ 實際入庫金額（短交）→ skip，⛔ 不替營運端的資料矛盾圓場',
          r5.skipped === 'AMOUNT_MISMATCH', `${r5.skipped}`);

        // ── ⑩ 沒有入庫流水 ──
        const rr5 = await mkRr('RR-TEST-HQ0-90005', { sub: 800, tax: 40 });
        const r6 = await postRrToGl(tx, { tenantId: T, rrId: rr5.id, userId: U });
        ok('⑩ 沒有任何入庫流水 → skip（不會憑空長出存貨）', r6.skipped === 'NO_STOCK_IN', `${r6.skipped}`);

        // ── ⑪~⑫ 🔴 子帳 vs 總帳 ──
        const glNet = async (code: string) => {
          const b = await tx.nx05GlBalance.findMany({
            where: { tenantId: T, fiscalPeriodId: period.id, accountCode: { code } },
            select: { closingDebit: true, closingCredit: true },
          });
          return b.reduce((s, r) => s + Number(r.closingDebit) - Number(r.closingCredit), 0);
        };
        const inAgg = await tx.nx03StockLedger.aggregate({
          where: { tenantId: T, sourceDocId: { in: [rr1.id, rr2.id] }, movementType: 'I' },
          _sum: { totalCost: true },
        });
        ok('⑪ 🔴 總帳 1121 存貨 ＝ 本輪已過帳進貨的實際入庫金額（2500）',
          (await glNet('1121')) === Number(inAgg._sum.totalCost ?? 0),
          `總帳 ${await glNet('1121')} vs 入庫 ${inAgg._sum.totalCost}`);
        ok('⑫ 🔴 總帳 2101 應付 ＝ 兩張已過帳進貨單的含稅金額（-2625，負數＝貸餘）',
          (await glNet('2101')) === -2625, `${await glNet('2101')}`);

        // ── ⑬~⑭ 🔴 免稅：稅額為 0 不可以炸掉整張單 ──
        // 16 條稅額分錄行原本都標成非條件性，金額 0 會讓 postByRule 丟例外、
        // 而過帳是在營運交易裡呼叫的 → 整張進貨單／銷貨單會被一起 rollback。
        const rr6 = await mkRr('RR-TEST-HQ0-90006', { sub: 1200, tax: 0 });
        await mkStockIn(rr6.id, 'P', 1200);
        const r7 = await postRrToGl(tx, { tenantId: T, rrId: rr6.id, userId: U });
        const l7 = await tx.nx05VoucherLine.findMany({
          where: { voucherId: r7.voucherId ?? '' }, orderBy: { lineNo: 'asc' },
          select: { drCr: true, amount: true, accountCode: { select: { code: true } } },
        });
        ok('⑬ 🔴 免稅進貨（稅額 0）→ 正常過帳、分錄少掉進項稅那一行（不是丟例外）',
          r7.skipped === null && l7.map((l) => `${l.drCr}${l.accountCode.code}`).join(',') === 'D1121,C2101',
          l7.map((l) => `${l.drCr}${l.accountCode.code}`).join(','));

        const customer = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: 'C' }, select: { id: true },
        });
        const soFree = await tx.nx04So.create({
          data: {
            tenantId: T, docNo: 'SO-TEST-HQ0-95001', soDate: D, customerId: customer!.id,
            warehouseId: wh!.id, currencyId: twd!.id,
            subtotal: new PrismaNs.Decimal(900), taxAmount: new PrismaNs.Decimal(0),
            totalAmount: new PrismaNs.Decimal(900), status: 'SHIPPED', deliveryType: 'D',
            taxRate: new PrismaNs.Decimal(0), createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });
        const r8 = await postSoToGl(tx, { tenantId: T, soId: soFree.id, userId: U });
        ok('⑭ 🔴 免稅銷貨（稅額 0）同樣不炸——同一批 16 條稅額行一起修掉',
          r8.skipped === null && !!r8.voucherId, `${r8.skipped ?? 'posted'}`);

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
