// apps/nx-api/test/e2e-scenarios/30-gl-opening.ts
// 總帳脊椎 C6（2026-08-01）：期初存貨開帳 —— 這一軌的驗收點。
//   ①~③ 大聲報錯而不是悄悄跳過：沒有會計期間 / 倉庫的據點沒設成本中心 / 開帳日太早導致負數
//   ④~⑥ 正常開帳：每個成本中心一張傳票、借存貨貸期初承接權益、金額＝該店的存貨價值
//   ⑦   擋重複：開帳只能做一次
//   ⑧~⑩ 🔴 對帳表：存貨那一項真的收斂到 0（恆迎真實資料 2.32 億）、覆蓋清單長出來
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';
import { Pool } from 'pg';

import { reconcileGl } from '../../src/shared/nx05/nx05-gl-reconcile';
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
        // 開帳日設在所有既有庫存流水之後 → 期初＝現在的庫存餘額（真實的切換情境）
        const OPEN = new Date('9993-07-15');

        // ── ① 沒有會計期間 → 報錯 ──
        const m1 = await expectThrow(() =>
          postOpeningInventory(tx, { tenantId: T, openingDate: OPEN, userId: U }),
        );
        ok('① 沒有開帳中的會計期間 → 大聲報錯（⛔ 不是悄悄跳過）',
          m1.includes('沒有開帳中的會計期間'), m1.slice(0, 40));

        await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: '9993-07', fiscalYear: 9993, periodNo: 7,
            startDate: new Date('9993-07-01'), endDate: new Date('9993-07-31'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
        });

        // ── ② 據點沒設成本中心 → 報錯、而且點名是哪些倉 ──
        const m2 = await expectThrow(() =>
          postOpeningInventory(tx, { tenantId: T, openingDate: OPEN, userId: U }),
        );
        ok('② 倉庫的據點沒設成本中心 → 報錯並點名是哪幾個倉（少開一個倉，帳從第一天就是錯的）',
          m2.includes('還沒設定對應成本中心') && m2.includes('Z00'), m2.slice(0, 46));

        // 幫四個據點各建一個成本中心（真實上線時這步要在主檔做）
        const sites = await tx.nx01Site.findMany({
          where: { tenantId: T }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' },
        });
        for (const s of sites) {
          const d = await tx.nx01Department.create({
            data: {
              tenantId: T, code: `CC-${s.code}`, name: `${s.name}成本中心`,
              createdBy: U, updatedBy: U,
            },
            select: { id: true },
          });
          await tx.nx01Site.update({
            where: { id: s.id }, data: { costCenterDeptId: d.id, updatedBy: U },
          });
        }

        // ── ③ 開帳日太早 → 之後的進貨比當時的庫存還多、算出負數就報錯 ──
        // 造一筆落在「早開帳日」與「正式開帳日」之間的大額進貨，金額超過該成本中心的存貨。
        // ⚠ 要挑「據點底下只有這一個倉」的倉（Z03／北投），否則同據點的大倉會把負數蓋掉。
        const smallWh = await tx.nx01Warehouse.findFirst({
          where: { tenantId: T, code: 'Z03' }, select: { id: true },
        });
        const anyPart = await tx.nx01Part.findFirst({ where: { tenantId: T }, select: { id: true } });
        const anyLoc = await tx.nx01Location.findFirst({
          where: { tenantId: T, warehouseId: smallWh!.id }, select: { id: true },
        });
        const fake = await tx.nx03StockLedger.create({
          data: {
            tenantId: T, movementDate: new Date('9993-07-10'),
            partId: anyPart!.id, warehouseId: smallWh!.id, locationId: anyLoc!.id,
            movementType: 'I',
            qtyIn: new PrismaNs.Decimal(1), qtyOut: new PrismaNs.Decimal(0),
            unitCost: new PrismaNs.Decimal(9000000), totalCost: new PrismaNs.Decimal(9000000),
            balanceQty: new PrismaNs.Decimal(1), balanceCost: new PrismaNs.Decimal(9000000),
            sourceModule: 'NX03', sourceDocType: 'I', sourceDocId: 'OPEN-TEST-FAKE',
          },
          select: { id: true },
        });
        const m3 = await expectThrow(() =>
          postOpeningInventory(tx, { tenantId: T, openingDate: new Date('9993-07-02'), userId: U }),
        );
        ok('③ 開帳日設得太早會算出負的期初存貨 → 報錯（那是資料問題不是會計問題）',
          m3.includes('負數'), m3.slice(0, 34));
        await tx.nx03StockLedger.delete({ where: { id: fake.id } });

        // ── ④~⑥ 正常開帳 ──
        const stockTotal = await tx.nx03StockBalance.aggregate({
          where: { tenantId: T }, _sum: { stockValue: true },
        });
        const expected = new PrismaNs.Decimal(stockTotal._sum.stockValue ?? 0);

        const r = await postOpeningInventory(tx, { tenantId: T, openingDate: OPEN, userId: U });
        ok('④ 每個成本中心一張傳票（哪一家店帶進來多少貨，帳上分得開）',
          r.lines.length === 4, `${r.lines.length} 張：${r.lines.map((l) => l.departmentName).join('、')}`);
        ok('⑤ 開帳總額 ＝ 庫存餘額表的存貨價值',
          r.totalAmount.equals(expected), `${r.totalAmount.toString()}`);

        const l0 = await tx.nx05VoucherLine.findMany({
          where: { voucherId: r.lines[0]!.voucherId }, orderBy: { lineNo: 'asc' },
          select: { drCr: true, departmentId: true, accountCode: { select: { code: true } } },
        });
        ok('⑥ 分錄＝借存貨、貸期初承接權益（⛔ 不是累積盈餘）',
          l0.map((l) => `${l.drCr}${l.accountCode.code}`).join(',') === 'D1121,C3103' &&
            l0[0]!.departmentId === r.lines[0]!.departmentId,
          l0.map((l) => `${l.drCr}${l.accountCode.code}`).join(','));

        // ── ⑦ 擋重複 ──
        const m4 = await expectThrow(() =>
          postOpeningInventory(tx, { tenantId: T, openingDate: OPEN, userId: U }),
        );
        ok('⑦ 開帳只能做一次（再做一次存貨會憑空多一倍）',
          m4.includes('已經做過了'), m4.slice(0, 30));

        // ── ⑧~⑩ 🔴 對帳表 ──
        const recon = await reconcileGl(tx, { tenantId: T, periodCode: '9993-07' });
        const c3 = recon.checks.find((c) => c.code === 'C3')!;
        ok('⑧ 🔴 對帳表「總帳存貨 ＝ 庫存餘額表」收斂到 0（這一軌的驗收點）',
          c3.passed && c3.difference.isZero(),
          `總帳 ${c3.actual.toString()} vs 庫存 ${c3.expected.toString()}`);

        const c3b = recon.checks.find((c) => c.code === 'C3b')!;
        ok('⑨ 庫存子帳自我一致性這一項有把「快照沒有流水撐腰」顯示出來（可解釋、不是謎）',
          !!c3b && c3b.severity === 'WARN', `差額 ${c3b.difference.toString()}`);

        const unwired = recon.coverage.filter((c) => !c.wired).map((c) => c.label);
        ok('⑩ 覆蓋清單列得出「還沒接進總帳的路」',
          recon.coverage.length >= 12 && unwired.length >= 2,
          `${recon.coverage.length} 條、未接 ${unwired.length} 條：${unwired.join('／')}`);

        out.push({
          項目: '（參考）開帳後的對帳總覽',
          結果: recon.checks
            .map((c) => `${c.code}${c.passed ? '✅' : `⚠${c.difference.toString()}`}`)
            .join(' '),
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
