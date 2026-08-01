// apps/nx-api/test/e2e-scenarios/26-gl-cost-center.ts
// 總帳脊椎 C1（2026-08-01）：成本中心改用「店」——倉庫 → 據點 → 對應成本中心。
//   ①~④ 解析器本身：走店 / 走人退路 / 部門停用不採用 / 兩邊都沒有
//   ⑤~⑦ 銷貨過帳實際吃到的成本中心：據點設了走店、沒設走人、都沒有就 skip
//   ⑧   🔴 相容性：據點沒設成本中心時，行為與 B6 完全一致（既有 8.8 萬張單不受影響）
// 只能對本機開發 DB 跑；全程在 transaction 內、結束 rollback，DB 不留任何資料。
import fs from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';
import { Pool } from 'pg';

import { resolveCostCenter } from '../../src/shared/nx05/nx05-cost-center';
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
          where: { tenantId: T },
          select: { id: true, siteId: true },
        });
        const sellerDept = await tx.nx01Department.findFirst({
          where: { tenantId: T },
          select: { id: true },
        });
        const seller = await tx.nx01User.findFirst({
          where: { tenantId: T, departmentId: sellerDept!.id },
          select: { id: true },
        });
        const customer = await tx.nx01Partner.findFirst({
          where: { tenantId: T, partnerType: 'C' },
          select: { id: true },
        });
        const twd = await tx.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });

        // 造一個「據點成本中心」部門——刻意不同於業務員的部門，才驗得出是誰勝出
        const siteDept = await tx.nx01Department.create({
          data: { tenantId: T, code: 'CC-TEST-SITE', name: '測試據點成本中心', createdBy: U, updatedBy: U },
          select: { id: true },
        });
        ok('（前置）業務員部門與據點成本中心是兩個不同部門', siteDept.id !== sellerDept!.id);

        // ── ① 據點還沒設成本中心 → 走人的退路 ──
        const c1 = await resolveCostCenter(tx, {
          tenantId: T, warehouseId: wh!.id, fallbackUserId: seller!.id,
        });
        ok('① 據點沒設成本中心 → 退回業務員部門、並標記走了退路',
          c1.source === 'USER' && c1.departmentId === sellerDept!.id, `${c1.source}`);

        // ── ② 據點設了成本中心 → 走店，且蓋過業務員部門 ──
        await tx.nx01Site.update({
          where: { id: wh!.siteId },
          data: { costCenterDeptId: siteDept.id, updatedBy: U },
        });
        const c2 = await resolveCostCenter(tx, {
          tenantId: T, warehouseId: wh!.id, fallbackUserId: seller!.id,
        });
        ok('② 據點設了成本中心 → 走店（不是業務員的部門）',
          c2.source === 'SITE' && c2.departmentId === siteDept.id, `${c2.source}`);

        // ── ③ 據點的成本中心被停用 → 不採用、退回人 ──
        await tx.nx01Department.update({ where: { id: siteDept.id }, data: { isActive: false, updatedBy: U } });
        const c3 = await resolveCostCenter(tx, {
          tenantId: T, warehouseId: wh!.id, fallbackUserId: seller!.id,
        });
        ok('③ 據點的成本中心已停用 → 不採用、退回業務員部門',
          c3.source === 'USER' && c3.departmentId === sellerDept!.id, `${c3.source}`);
        await tx.nx01Department.update({ where: { id: siteDept.id }, data: { isActive: true, updatedBy: U } });

        // ── ④ 兩邊都給不出 → NONE（⛔ 不亂塞一個部門）──
        const c4 = await resolveCostCenter(tx, { tenantId: T, warehouseId: null, fallbackUserId: null });
        ok('④ 店與人都給不出 → 回 NONE，⛔ 不亂塞一個部門',
          c4.source === 'NONE' && c4.departmentId === null);

        // ── 銷貨過帳實測 ──
        const period = await tx.nx05FiscalPeriod.create({
          data: {
            tenantId: T, code: '9997-11', fiscalYear: 9997, periodNo: 11,
            startDate: new Date('9997-11-01'), endDate: new Date('9997-11-30'),
            status: 'OPEN', isYearEnd: true, createdBy: U, updatedBy: U,
          },
          select: { id: true },
        });
        const D = new Date('9997-11-15');
        // ⚠ 幣別必須給真 ID：nx04_so.currency_id 的 @default("TWD") 是壞的（全庫 13 處）
        const mkSo = async (docNo: string, salesPersonId: string | null) =>
          tx.nx04So.create({
            data: {
              tenantId: T, docNo, soDate: D, customerId: customer!.id, warehouseId: wh!.id,
              currencyId: twd!.id,
              subtotal: new PrismaNs.Decimal(1000), taxAmount: new PrismaNs.Decimal(50),
              totalAmount: new PrismaNs.Decimal(1050),
              status: 'SHIPPED', salesPersonId, deliveryType: 'D',
              taxRate: new PrismaNs.Decimal(5), createdBy: U, updatedBy: U,
            },
            select: { id: true },
          });

        const deptOfIncomeLine = async (voucherId: string) => {
          const l = await tx.nx05VoucherLine.findFirst({
            where: { voucherId, accountCode: { code: '4101' } },
            select: { departmentId: true },
          });
          return l?.departmentId ?? null;
        };

        // ⑤ 據點有成本中心 → 分錄吃到的是店
        const soA = await mkSo('SO-TEST-HQ0-96001', seller!.id);
        const rA = await postSoToGl(tx, { tenantId: T, soId: soA.id, userId: U });
        ok('⑤ 據點設了成本中心 → 銷貨分錄的成本中心＝該據點的成本中心',
          (await deptOfIncomeLine(rA.voucherId!)) === siteDept.id);
        ok('⑥ 過帳結果回報成本中心是從「店」解析來的', rA.costCenterSource === 'SITE', `${rA.costCenterSource}`);

        // ⑦~⑧ 據點沒設成本中心 → 行為與 B6 完全一致
        await tx.nx01Site.update({
          where: { id: wh!.siteId }, data: { costCenterDeptId: null, updatedBy: U },
        });
        const soB = await mkSo('SO-TEST-HQ0-96002', seller!.id);
        const rB = await postSoToGl(tx, { tenantId: T, soId: soB.id, userId: U });
        ok('⑦ 🔴 據點沒設成本中心 → 仍走業務員部門（既有 8.8 萬張單不受影響）',
          (await deptOfIncomeLine(rB.voucherId!)) === sellerDept!.id && rB.costCenterSource === 'USER',
          `${rB.costCenterSource}`);

        const soC = await mkSo('SO-TEST-HQ0-96003', null);
        const rC = await postSoToGl(tx, { tenantId: T, soId: soC.id, userId: U });
        ok('⑧ 店與人都給不出 → 維持 skip、⛔ 不亂塞部門', rC.skipped === 'NO_DEPARTMENT', `${rC.skipped}`);

        // 用掉 period 變數（避免 lint unused）並確認傳票確實落在這一期
        const vCount = await tx.nx05Voucher.count({
          where: { tenantId: T, fiscalPeriodId: period.id },
        });
        ok('（附）本輪傳票都落在測試期間內', vCount === 2, `${vCount}`);

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
