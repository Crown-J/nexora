// apps/nx-api/test/e2e-scenarios/28-gl-stock-docs.ts
// 總帳脊椎 C3（2026-08-01）：庫存三張單接上總帳——調撥／盤點盈虧／報廢。
//   ①~④ 調撥：安全閘 / 同科目不同成本中心 / 兩端同一成本中心不開傳票 / 冪等
//   ⑤~⑦ 盤點：盤盈 / 盤虧 / 🔴 同一張單同時有盈有虧時不軋淨額
//   ⑧~⑨ 報廢：正常 / 成本 0 不開傳票（不良品倉成本本來就是 0）
//   ⑩   🔴 三張單過完，總帳存貨的變動 ＝ 三張單造成的庫存流水淨額
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';
import { Pool } from 'pg';

import {
  postDisposalToGl,
  postStockTakeToGl,
  postTransferToGl,
} from '../../src/shared/nx05/nx05-post-stock-doc-to-gl';

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
        // 三個倉：A 與 B 在不同據點、A 與 C 在同一據點（驗「同成本中心不開傳票」）
        const whs = await tx.nx01Warehouse.findMany({
          where: { tenantId: T }, select: { id: true, code: true, siteId: true }, orderBy: { code: 'asc' },
        });
        const whA = whs.find((w) => w.code === 'Z00')!;
        const whB = whs.find((w) => w.code === 'Z01')!;
        const whC = whs.find((w) => w.code === 'Z04')!; // 與 Z00 同據點
        ok('（前置）Z00 與 Z01 不同據點、Z00 與 Z04 同據點',
          whA.siteId !== whB.siteId && whA.siteId === whC.siteId);

        const part = await tx.nx01Part.findFirst({ where: { tenantId: T }, select: { id: true } });
        const locOf = async (whId: string) =>
          (await tx.nx01Location.findFirst({
            where: { tenantId: T, warehouseId: whId }, select: { id: true },
          }))!.id;
        const locA = await locOf(whA.id);
        const locB = await locOf(whB.id);

        // 兩個據點各設一個成本中心
        const ccA = await tx.nx01Department.create({
          data: { tenantId: T, code: 'CC-TEST-A', name: '測試成本中心A', createdBy: U, updatedBy: U },
          select: { id: true },
        });
        const ccB = await tx.nx01Department.create({
          data: { tenantId: T, code: 'CC-TEST-B', name: '測試成本中心B', createdBy: U, updatedBy: U },
          select: { id: true },
        });
        await tx.nx01Site.update({ where: { id: whA.siteId }, data: { costCenterDeptId: ccA.id, updatedBy: U } });
        await tx.nx01Site.update({ where: { id: whB.siteId }, data: { costCenterDeptId: ccB.id, updatedBy: U } });

        const D = new Date('9995-09-15');
        const mkLedger = async (o: {
          docType: string; docId: string; whId: string; locId: string;
          dir: 'I' | 'O'; amount: number;
        }) =>
          tx.nx03StockLedger.create({
            data: {
              tenantId: T, movementDate: D, partId: part!.id, warehouseId: o.whId, locationId: o.locId,
              movementType: o.dir,
              qtyIn: new PrismaNs.Decimal(o.dir === 'I' ? 10 : 0),
              qtyOut: new PrismaNs.Decimal(o.dir === 'O' ? 10 : 0),
              unitCost: new PrismaNs.Decimal(o.amount / 10),
              totalCost: new PrismaNs.Decimal(o.amount),
              balanceQty: new PrismaNs.Decimal(10), balanceCost: new PrismaNs.Decimal(o.amount / 10),
              sourceModule: 'NX03', sourceDocType: o.docType, sourceDocId: o.docId,
            },
          });

        const mkSt = async (docNo: string, from: string, to: string) =>
          tx.nx03St.create({
            data: {
              tenantId: T, docNo, stDate: D, fromWarehouseId: from, toWarehouseId: to,
              status: 'RECEIVED', createdBy: U, updatedBy: U,
            },
            select: { id: true },
          });

        // ── ① 安全閘：還沒有會計期間 ──
        const st1 = await mkSt('ST-TEST-HQ0-90001', whA.id, whB.id);
        await mkLedger({ docType: 'X', docId: st1.id, whId: whA.id, locId: locA, dir: 'O', amount: 3000 });
        await mkLedger({ docType: 'X', docId: st1.id, whId: whB.id, locId: locB, dir: 'I', amount: 3000 });
        const r0 = await postTransferToGl(tx, { tenantId: T, stId: st1.id, userId: U });
        ok('① 沒有開帳中的會計期間 → skip、不擋調撥流程',
          r0.skipped === 'NO_OPEN_PERIOD', `${r0.skipped}`);

        const period = await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: '9995-09', fiscalYear: 9995, periodNo: 9,
            startDate: new Date('9995-09-01'), endDate: new Date('9995-09-30'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });

        // ── ②~④ 調撥 ──
        const r1 = await postTransferToGl(tx, { tenantId: T, stId: st1.id, userId: U });
        const l1 = await tx.nx05VoucherLine.findMany({
          where: { voucherId: r1.voucherId ?? '' }, orderBy: { lineNo: 'asc' },
          select: { drCr: true, amount: true, departmentId: true, accountCode: { select: { code: true } } },
        });
        ok('② 調撥＝同科目、不同成本中心、金額相等（不產生任何損益）',
          l1.map((l) => `${l.drCr}${l.accountCode.code}`).join(',') === 'D1121,C1121' &&
            Number(l1[0]!.amount) === 3000 && Number(l1[1]!.amount) === 3000,
          l1.map((l) => `${l.drCr}${l.accountCode.code}${Number(l.amount)}`).join(','));
        ok('③ 借方＝目的倉的成本中心、貸方＝來源倉的成本中心',
          l1[0]!.departmentId === ccB.id && l1[1]!.departmentId === ccA.id);

        const st2 = await mkSt('ST-TEST-HQ0-90002', whA.id, whC.id); // 同據點
        await mkLedger({ docType: 'X', docId: st2.id, whId: whA.id, locId: locA, dir: 'O', amount: 500 });
        const r2 = await postTransferToGl(tx, { tenantId: T, stId: st2.id, userId: U });
        ok('④ 兩端同一個成本中心 → 不開傳票（借貸會完全相同、看起來像沒發生過）',
          r2.skipped === 'SAME_COST_CENTER', `${r2.skipped}`);

        const r3 = await postTransferToGl(tx, { tenantId: T, stId: st1.id, userId: U });
        ok('（附）調撥冪等：同一張單不會重複開傳票',
          r3.skipped === 'ALREADY_POSTED' && r3.voucherId === r1.voucherId);

        // ── ⑤~⑦ 盤點 ──
        const mkStk = async (docNo: string) =>
          tx.nx03StockTake.create({
            data: {
              tenantId: T, docNo, stockTakeDate: D, warehouseId: whA.id,
              status: 'POSTED', createdBy: U, updatedBy: U,
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

        const stkGain = await mkStk('STK-TEST-HQ0-90001');
        await mkLedger({ docType: 'T', docId: stkGain.id, whId: whA.id, locId: locA, dir: 'I', amount: 800 });
        const r4 = await postStockTakeToGl(tx, { tenantId: T, stockTakeId: stkGain.id, userId: U });
        ok('⑤ 盤盈 → 借存貨、貸盤盈盤虧', (await codesOf(r4.voucherId)) === 'D1121800,C5103800',
          await codesOf(r4.voucherId));

        const stkLoss = await mkStk('STK-TEST-HQ0-90002');
        await mkLedger({ docType: 'T', docId: stkLoss.id, whId: whA.id, locId: locA, dir: 'O', amount: 200 });
        const r5 = await postStockTakeToGl(tx, { tenantId: T, stockTakeId: stkLoss.id, userId: U });
        ok('⑥ 盤虧 → 借盤盈盤虧、貸存貨', (await codesOf(r5.voucherId)) === 'D5103200,C1121200',
          await codesOf(r5.voucherId));

        const stkBoth = await mkStk('STK-TEST-HQ0-90003');
        await mkLedger({ docType: 'T', docId: stkBoth.id, whId: whA.id, locId: locA, dir: 'I', amount: 600 });
        await mkLedger({ docType: 'T', docId: stkBoth.id, whId: whA.id, locId: locA, dir: 'O', amount: 250 });
        const r6 = await postStockTakeToGl(tx, { tenantId: T, stockTakeId: stkBoth.id, userId: U });
        ok('⑦ 🔴 同一張盤點單同時有盈有虧 → 四行都出現、⛔ 不軋成淨額 350',
          (await codesOf(r6.voucherId)) === 'D1121600,C5103600,D5103250,C1121250',
          await codesOf(r6.voucherId));

        // ── ⑧~⑨ 報廢 ──
        const mkDs = async (docNo: string) =>
          tx.nx03Disposal.create({
            data: {
              tenantId: T, docNo, disposalDate: D, warehouseId: whA.id,
              status: 'POSTED', createdBy: U, updatedBy: U,
            },
            select: { id: true },
          });
        const ds1 = await mkDs('DS-TEST-HQ0-90001');
        await mkLedger({ docType: 'W', docId: ds1.id, whId: whA.id, locId: locA, dir: 'O', amount: 400 });
        const r7 = await postDisposalToGl(tx, { tenantId: T, disposalId: ds1.id, userId: U });
        ok('⑧ 報廢 → 借報廢損失、貸存貨', (await codesOf(r7.voucherId)) === 'D5104400,C1121400',
          await codesOf(r7.voucherId));

        const ds2 = await mkDs('DS-TEST-HQ0-90002'); // 沒有庫存流水＝不良品倉成本 0
        const r8 = await postDisposalToGl(tx, { tenantId: T, disposalId: ds2.id, userId: U });
        ok('⑨ 報廢成本 0（不良品倉）→ 不開傳票、只減數量', r8.skipped === 'NO_AMOUNT', `${r8.skipped}`);

        // ── ⑩ 🔴 總帳存貨的變動 ＝ 這幾張單造成的庫存流水淨額 ──
        const glInv = await tx.nx05GlBalance.findMany({
          where: { tenantId: T, fiscalPeriodId: period.id, accountCode: { code: '1121' } },
          select: { closingDebit: true, closingCredit: true },
        });
        const glNet = glInv.reduce((s, r) => s + Number(r.closingDebit) - Number(r.closingCredit), 0);
        // 已過帳的單：調撥（±3000 抵銷）、盤盈 800、盤虧 -200、盈虧單 +600/-250、報廢 -400
        const expected = 0 + 800 - 200 + 600 - 250 - 400;
        ok('⑩ 🔴 總帳 1121 存貨的本期變動 ＝ 已過帳單據的庫存流水淨額（550）',
          glNet === expected, `總帳 ${glNet} vs 預期 ${expected}`);

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
