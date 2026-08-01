// apps/nx-api/test/e2e-scenarios/25-gl-reconcile.ts
// 總帳脊椎 B7（2026-08-01）：子帳 vs 總帳驗證。
//   ①~④ 乾淨狀態：傳票內部一致、餘額表與分錄行一致、應收對得起來、已完成銷貨單都有傳票
//   ⑤~⑦ 🔴 故意弄壞，驗證抓不抓得到：改壞餘額表／建應收不過帳／塞一行不平的分錄
//   ⑧    尚未接上總帳的子帳（存貨）會誠實報差額，且訊息說得出「這是進度不是錯」
//   ⑨    ⛔ 驗證不會自動調帳（只報告、不動任何數字）
// ⚠ 用「差額的變化量」而不是絕對值來驗——租戶本來就有既有資料（庫存 2.3 億尚未接總帳）。
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';
import { Pool } from 'pg';

import { createArFromShippedSo } from '../../src/shared/nx05/nx05-create-ar-from-so';
import { reconcileGl, type ReconResult } from '../../src/shared/nx05/nx05-gl-reconcile';
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
const get = (r: ReconResult, code: string) => r.checks.find((c) => c.code === code)!;

async function main(): Promise<void> {
  await prisma
    .$transaction(
      async (tx) => {
        const dept = await tx.nx01Department.findFirst({ where: { tenantId: T }, select: { id: true } });
        const customer = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: 'C' }, select: { id: true },
        });
        const wh = await tx.nx01Warehouse.findFirst({ where: { tenantId: T }, select: { id: true } });
        const seller = await tx.nx01User.findFirst({
          where: { tenantId: T, departmentId: dept!.id }, select: { id: true },
        });
        const twd = await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });

        const period = await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: '9998-12', fiscalYear: 9998, periodNo: 12,
            startDate: new Date('9998-12-01'), endDate: new Date('9998-12-31'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
          select: { id: true, code: true },
        });
        const D = new Date('9998-12-15');
        const P = { tenantId: T, periodCode: period.code };

        // 基準線：租戶既有資料造成的差額（庫存 2.3 億尚未接總帳等）
        const base = await reconcileGl(tx, P);

        // ── 造一張已完成銷貨單 → 建應收 → 過帳 ──
        const so = await tx.nx04So.create({
          data: {
            tenantId: T, docNo: 'SO-RECON-HQ0-90001', soDate: D,
            customerId: customer!.id, warehouseId: wh!.id, currencyId: twd!.id,
            subtotal: new PrismaNs.Decimal(1000), taxAmount: new PrismaNs.Decimal(50),
            totalAmount: new PrismaNs.Decimal(1050), taxRate: new PrismaNs.Decimal(5),
            status: 'COMPLETED', deliveryType: 'D', salesPersonId: seller!.id,
            createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });
        await createArFromShippedSo(tx, { tenantId: T, soId: so.id, userId: U });
        const posted = await postSoToGl(tx, { tenantId: T, soId: so.id, userId: U });

        const r1 = await reconcileGl(tx, P);

        // ── ①~④ 乾淨狀態 ──
        ok('① 傳票內部一致：每張已過帳傳票借貸相等', get(r1, 'A1').passed);
        ok('② 傳票表頭合計 ＝ 分錄行合計', get(r1, 'A2').passed);
        ok('③ 科目餘額 ＝ 分錄行重算結果（餘額表沒 drift）', get(r1, 'B1').passed);
        ok('④ 🔴 我加的應收與分錄互相抵銷（應收差額沒有變大）',
          get(r1, 'C1').difference.equals(get(base, 'C1').difference),
          `基準 ${get(base, 'C1').difference} → 現在 ${get(r1, 'C1').difference}`);
        ok('⑤ 本期已完成銷貨單都有對應傳票', get(r1, 'D1').passed,
          `已完成 ${get(r1, 'D1').expected} / 已過帳 ${get(r1, 'D1').actual}`);

        // ── ⑥ 故意改壞科目餘額 → B1 要抓到 ──
        const oneBal = await tx.nx05GlBalance.findFirst({
          where: { tenantId: T, fiscalPeriodId: period.id }, select: { id: true, periodDebit: true },
        });
        await tx.nx05GlBalance.update({
          where: { id: oneBal!.id },
          data: { periodDebit: new PrismaNs.Decimal(oneBal!.periodDebit).add(99) },
        });
        const r2 = await reconcileGl(tx, P);
        ok('⑥ 🔴 手動改壞科目餘額 → B1 抓到', !get(r2, 'B1').passed, get(r2, 'B1').hint.slice(0, 30));
        await tx.nx05GlBalance.update({
          where: { id: oneBal!.id }, data: { periodDebit: oneBal!.periodDebit },
        });

        // ── ⑦ 建應收但不過帳 → C1 差額要跟著變 ──
        const so2 = await tx.nx04So.create({
          data: {
            tenantId: T, docNo: 'SO-RECON-HQ0-90002', soDate: D,
            customerId: customer!.id, warehouseId: wh!.id, currencyId: twd!.id,
            subtotal: new PrismaNs.Decimal(2000), taxAmount: new PrismaNs.Decimal(100),
            totalAmount: new PrismaNs.Decimal(2100), taxRate: new PrismaNs.Decimal(5),
            status: 'SHIPPED', deliveryType: 'D', salesPersonId: seller!.id,
            createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });
        await createArFromShippedSo(tx, { tenantId: T, soId: so2.id, userId: U });
        const r3 = await reconcileGl(tx, P);
        ok('⑦ 🔴 應收建了卻沒過帳 → C1 差額正好差那 2100',
          get(r3, 'C1').difference.equals(get(r1, 'C1').difference.sub(2100)),
          `${get(r1, 'C1').difference} → ${get(r3, 'C1').difference}`);

        // ── ⑧ 塞一行不平的分錄 → A1 要抓到 ──
        const anyAcc = await tx.nx05AccountCode.findFirst({
          where: { tenantId: T, code: '1101' }, select: { id: true },
        });
        await tx.nx05VoucherLine.create({
          data: {
            tenantId: T, voucherId: posted.voucherId!, lineNo: 99, drCr: 'D',
            accountCodeId: anyAcc!.id, amount: new PrismaNs.Decimal(1),
            createdBy: U, updatedBy: U,
          },
        });
        const r4 = await reconcileGl(tx, P);
        ok('⑧ 🔴 繞過 postByRule 直接塞不平的分錄 → A1 抓到', !get(r4, 'A1').passed,
          get(r4, 'A1').hint.slice(0, 34));

        // ── ⑨ 尚未接上總帳的子帳誠實報差額 ──
        const c3 = get(r1, 'C3');
        ok('⑨ 存貨尚未接總帳 → C3 誠實報差額，且訊息說得出這是進度不是錯',
          !c3.passed && c3.hint.includes('必然有差額'),
          `子帳 ${c3.expected} vs 總帳 ${c3.actual}`);

        // ── ⑩ ⛔ 驗證不自動調帳 ──
        const balBefore = await tx.nx05GlBalance.count({ where: { tenantId: T, fiscalPeriodId: period.id } });
        const arBefore = await tx.nx05ArLedger.count({ where: { tenantId: T } });
        await reconcileGl(tx, P);
        const balAfter = await tx.nx05GlBalance.count({ where: { tenantId: T, fiscalPeriodId: period.id } });
        const arAfter = await tx.nx05ArLedger.count({ where: { tenantId: T } });
        ok('⑩ ⛔ 驗證只報告、不自動調帳（餘額與子帳筆數都沒被動過）',
          balBefore === balAfter && arBefore === arAfter, `${balAfter} 列餘額 / ${arAfter} 筆應收`);

        out.push({
          項目: '（參考）本期對帳總覽',
          結果: r1.checks
            .map((c) => `${c.code}${c.passed ? '✅' : `⚠${c.difference}`}`)
            .join(' '),
        });

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
