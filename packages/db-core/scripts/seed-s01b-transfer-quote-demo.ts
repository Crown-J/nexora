// packages/db-core/scripts/seed-s01b-transfer-quote-demo.ts
// 一次性測試資料：攻略本 S01B「調貨詢價」用——對 TW-100001（恆迎/偉盟）補兩塊素材：
//   1) 客戶 C0049 一筆掛「調貨」旗標的報價紀錄（nx04_quote_record.is_transfer=true、remark=MARK）
//   2) 客戶 C0049 的「預設取貨方式」default_delivery_type='D'（配送）
// 皮帶料 025 260 849B（全倉 0）為調貨標的、與 seed-instant-inquiry-demo 的詢價歷史呼應。
//   帶測試標記 remark，--purge 一鍵清除（並把 C0049 取貨方式從 D 還原成 null）；重跑預設會擋，--force 強制再塞一筆。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';

const MARK = 'seed:S01B調貨';
const CUSTOMER_CODE = 'C0049';
const PART_CODE = '025 260 849B';
const UNIT_PRICE = 480;
const DELIVERY_TYPE = 'D'; // D=配送 / P=自取 / C=寄貨（值域同 nx04_so.delivery_type）

async function main() {
  const purge = process.argv.includes('--purge');
  const force = process.argv.includes('--force');

  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  if (!t) throw new Error('租戶 TW-100001 不存在');
  const tenantId = t.id;

  const customer = await prisma.nx01Partner.findFirst({ where: { tenantId, code: CUSTOMER_CODE }, select: { id: true } });

  if (purge) {
    const del = await prisma.nx04QuoteRecord.deleteMany({ where: { tenantId, remark: MARK } });
    // 取貨方式只在「目前為 D」時還原成 null，避免蓋掉非本 seed 設的值
    let reverted = 0;
    if (customer) {
      const r = await prisma.nx01Partner.updateMany({
        where: { id: customer.id, defaultDeliveryType: DELIVERY_TYPE },
        data: { defaultDeliveryType: null },
      });
      reverted = r.count;
    }
    console.log(
      `已清除 ${del.count} 筆測試報價紀錄` +
        (reverted ? `、C0049 取貨方式已還原為（未指定）。` : `。`),
    );
    return;
  }

  const existing = await prisma.nx04QuoteRecord.count({ where: { tenantId, remark: MARK } });
  if (existing > 0 && !force) {
    console.log(`已存在 ${existing} 筆測試報價紀錄（remark=${MARK}）；如要再塞請加 --force，或先 --purge。`);
    // 即使已存在，仍確保取貨方式維持 D（冪等）
    if (customer) {
      await prisma.nx01Partner.updateMany({
        where: { id: customer.id, NOT: { defaultDeliveryType: DELIVERY_TYPE } },
        data: { defaultDeliveryType: DELIVERY_TYPE },
      });
    }
    return;
  }

  if (!customer) throw new Error(`查無客戶 ${CUSTOMER_CODE}（本租戶）`);

  const [part, twd, seedUser] = await Promise.all([
    prisma.nx01Part.findFirst({ where: { tenantId, code: PART_CODE }, select: { id: true, code: true, name: true } }),
    prisma.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }),
    prisma.nx01User.findFirst({
      where: { tenantId, isActive: true, userAccount: { startsWith: 'Y' } },
      orderBy: { userAccount: 'asc' },
      select: { id: true },
    }),
  ]);
  if (!part) throw new Error(`查無料號 ${PART_CODE}（本租戶）`);
  if (!twd) throw new Error('找不到 TWD 幣別');
  if (!seedUser) throw new Error('找不到可用的業務員（本租戶啟用中 Y 帳號）');

  // 1) 掛調貨旗標的報價紀錄（欄位對齊 RecordService.createQuoteRecord）
  const rec = await prisma.nx04QuoteRecord.create({
    data: {
      tenantId,
      recordDate: new Date(),
      customerId: customer.id,
      partId: part.id,
      partNo: part.code,
      partName: part.name,
      qty: new Prisma.Decimal(1),
      unitPrice: new Prisma.Decimal(UNIT_PRICE),
      currencyId: twd.id,
      source: 'INSTANT',
      isTransfer: true,
      salesPersonId: seedUser.id,
      remark: MARK,
      createdBy: seedUser.id,
      updatedBy: seedUser.id,
    },
    select: { id: true },
  });
  console.log(`  ✔ 報價紀錄 ${rec.id}（${CUSTOMER_CODE} / ${part.code} @${UNIT_PRICE}、調貨旗標）`);

  // 2) C0049 預設取貨方式 = 配送（冪等）
  await prisma.nx01Partner.update({ where: { id: customer.id }, data: { defaultDeliveryType: DELIVERY_TYPE } });
  console.log(`  ✔ C0049 預設取貨方式 = ${DELIVERY_TYPE}（配送）`);

  console.log('完成。');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => disconnectPrisma());
