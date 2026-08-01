// apps/nx-api/test/e2e-scenarios/24-gl-so-posting.ts
// 總帳脊椎 B6（2026-08-01）：第一條劇本接上總帳——銷貨單 → 自動產生分錄。
//   ①~② 安全閘：沒有開帳中的會計期間就 skip（不擋銷貨流程）
//   ③~⑧ 正常路徑：分錄 5 行、科目由規則決定、金額對得上銷貨單、成本從庫存流水彙總
//   ⑨~⑪ 冪等、來源單據雙向查得到、缺成本中心時 skip
//   ⑫~⑬ 🔴 子帳 vs 總帳：應收帳款總帳餘額 ＝ 應收子帳合計
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';
import { Pool } from 'pg';

import { createArFromShippedSo } from '../../src/shared/nx05/nx05-create-ar-from-so';
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
        const dept = await tx.nx01Department.findFirst({ where: { tenantId: T }, select: { id: true } });
        const customer = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: 'C' }, select: { id: true },
        });
        const wh = await tx.nx01Warehouse.findFirst({ where: { tenantId: T }, select: { id: true } });
        const seller = await tx.nx01User.findFirst({
          where: { tenantId: T, departmentId: dept!.id }, select: { id: true },
        });
        // ⚠ 必須給真幣別 ID：nx04_so.currency_id 的 @default("TWD") 是壞的
        //   （幣別主鍵是 NX01CURR0000001 內碼、不是 'TWD' 字面值）——全庫尚有 13 處同樣寫法。
        const twd = await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });

        // 造一張銷貨單（未稅 1000／稅 50／含稅 1050）
        const mkSo = async (docNo: string, soDate: Date, salesPersonId: string | null) =>
          tx.nx04So.create({
            data: {
              tenantId: T, docNo, soDate, customerId: customer!.id, warehouseId: wh!.id,
              currencyId: twd!.id,
              subtotal: new PrismaNs.Decimal(1000), taxAmount: new PrismaNs.Decimal(50),
              totalAmount: new PrismaNs.Decimal(1050),
              status: 'SHIPPED', salesPersonId, deliveryType: 'D',
              taxRate: new PrismaNs.Decimal(5), createdBy: U, updatedBy: U,
            },
            select: { id: true, docNo: true },
          });

        const D = new Date('9998-12-15');
        const so1 = await mkSo('SO-TEST-HQ0-90001', D, seller!.id);

        // ── ①~② 安全閘：還沒有會計期間 ──
        const r0 = await postSoToGl(tx, { tenantId: T, soId: so1.id, userId: U });
        ok('① 沒有開帳中的會計期間 → skip、不產生傳票', r0.skipped === 'NO_OPEN_PERIOD' && !r0.voucherId,
          `${r0.skipped}`);
        ok('② skip 不擋銷貨流程（沒有丟例外）', true);

        const period = await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: '9998-12', fiscalYear: 9998, periodNo: 12,
            startDate: new Date('9998-12-01'), endDate: new Date('9998-12-31'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });

        // 造一筆庫存出庫流水，讓銷貨成本有來源（模擬 postSoStockOut 的產物）
        const part = await tx.nx01Part.findFirst({ where: { tenantId: T }, select: { id: true } });
        const loc = await tx.nx01Location.findFirst({
          where: { tenantId: T, warehouseId: wh!.id }, select: { id: true },
        });
        await tx.nx03StockLedger.create({
          data: {
            tenantId: T, movementDate: D, partId: part!.id, warehouseId: wh!.id, locationId: loc!.id,
            movementType: 'O', qtyIn: new PrismaNs.Decimal(0), qtyOut: new PrismaNs.Decimal(2),
            unitCost: new PrismaNs.Decimal(300), totalCost: new PrismaNs.Decimal(600),
            balanceQty: new PrismaNs.Decimal(0), balanceCost: new PrismaNs.Decimal(300),
            sourceModule: 'NX04', sourceDocType: 'S', sourceDocId: so1.id,
          },
        });

        // ── ③~⑧ 正常路徑 ──
        const r1 = await postSoToGl(tx, { tenantId: T, soId: so1.id, userId: U });
        ok('③ 啟用總帳後自動產生傳票', !!r1.voucherId && r1.skipped === null, `${r1.docNo}`);
        ok('④ 銷貨成本從庫存流水彙總＝600', Number(r1.cogs) === 600, `${r1.cogs}`);

        const lines = await tx.nx05VoucherLine.findMany({
          where: { voucherId: r1.voucherId! }, orderBy: { lineNo: 'asc' },
          select: {
            drCr: true, amount: true, departmentId: true, partnerId: true,
            accountCode: { select: { code: true } },
          },
        });
        ok('⑤ 分錄 5 行、科目由規則決定（呼叫端沒指定任何科目）',
          lines.map((l) => `${l.drCr}${l.accountCode.code}`).join(',') ===
            'D1111,C4101,C2121,D5101,C1121',
          lines.map((l) => `${l.drCr}${l.accountCode.code}`).join(','));
        ok('⑥ 應收 1050／收入 1000／稅 50／成本 600 皆對得上銷貨單',
          Number(lines[0]!.amount) === 1050 && Number(lines[1]!.amount) === 1000 &&
            Number(lines[2]!.amount) === 50 && Number(lines[3]!.amount) === 600,
          lines.map((l) => Number(l.amount)).join('/'));
        ok('⑦ 收入與成本帶著成本中心（貢獻式損益要用）',
          !!lines[1]!.departmentId && !!lines[3]!.departmentId);
        ok('⑧ 應收與收入帶著往來對象', !!lines[0]!.partnerId && !!lines[1]!.partnerId);

        // ── ⑨~⑪ 冪等 / 雙向查 / 缺成本中心 ──
        const r2 = await postSoToGl(tx, { tenantId: T, soId: so1.id, userId: U });
        ok('⑨ 冪等：同一張銷貨單再過一次不會重複開傳票',
          r2.skipped === 'ALREADY_POSTED' && r2.voucherId === r1.voucherId);

        const back = await tx.nx05Voucher.findFirst({
          where: { tenantId: T, sourceDocType: 'SO', sourceDocId: so1.id },
          select: { sourceDocNo: true },
        });
        ok('⑩ 從傳票查得回來源銷貨單', back?.sourceDocNo === so1.docNo, back?.sourceDocNo ?? '');

        const so2 = await mkSo('SO-TEST-HQ0-90002', D, null); // 無業務員 → 推不出成本中心
        const r3 = await postSoToGl(tx, { tenantId: T, soId: so2.id, userId: U });
        ok('⑪ 推不出成本中心時 skip（不亂塞一個部門）', r3.skipped === 'NO_DEPARTMENT', `${r3.skipped}`);

        // ── ⑫~⑬ 🔴 子帳 vs 總帳（B7 的預演）──
        await createArFromShippedSo(tx, { tenantId: T, soId: so1.id, userId: U });
        const arSum = await tx.nx05ArLedger.aggregate({
          where: { tenantId: T, soId: so1.id }, _sum: { originalAmount: true },
        });
        const glAr = await tx.nx05GlBalance.findFirst({
          where: { tenantId: T, fiscalPeriodId: period.id, accountCode: { code: '1111' } },
          select: { closingDebit: true, closingCredit: true },
        });
        const glArNet = Number(glAr?.closingDebit ?? 0) - Number(glAr?.closingCredit ?? 0);
        ok('⑫ 🔴 應收子帳合計 1050', Number(arSum._sum.originalAmount ?? 0) === 1050,
          `${arSum._sum.originalAmount}`);
        ok('⑬ 🔴 總帳 1111 應收帳款餘額 ＝ 應收子帳合計（帳對得起來）',
          glArNet === Number(arSum._sum.originalAmount ?? 0), `總帳 ${glArNet} vs 子帳 ${arSum._sum.originalAmount}`);

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
