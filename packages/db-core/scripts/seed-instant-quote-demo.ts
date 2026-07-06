// packages/db-core/scripts/seed-instant-quote-demo.ts
// 一次性測試資料：對 TW-100001（恆迎）塞報價紀錄表（nx04_quote_record，source=INSTANT），供「報價紀錄」頁預覽。
//   帶測試標記 remark，可用 --purge 一鍵清除。重跑預設會擋（已存在測試資料時）；--force 強制再塞。
//   --purge-legacy：清掉舊版塞在 nx04_quote 的 source=INSTANT 測試報價（A3 搬遷用）。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';

const MARK = '【測試】即時報價示範';

async function main() {
  const purge = process.argv.includes('--purge');
  const purgeLegacy = process.argv.includes('--purge-legacy');
  const force = process.argv.includes('--force');

  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  if (!t) throw new Error('租戶 TW-100001 不存在');
  const tenantId = t.id;

  // 舊版清理：把塞在 nx04_quote 的 INSTANT 測試報價（含明細）刪掉
  if (purgeLegacy) {
    const marked = await prisma.nx04Quote.findMany({
      where: { tenantId, source: 'INSTANT', remark: MARK },
      select: { id: true },
    });
    const ids = marked.map((m) => m.id);
    if (!ids.length) {
      console.log('沒有舊版 nx04_quote INSTANT 測試資料。');
      return;
    }
    await prisma.nx04QuoteItem.deleteMany({ where: { quoteId: { in: ids } } });
    const del = await prisma.nx04Quote.deleteMany({ where: { id: { in: ids } } });
    console.log(`已清除 ${del.count} 筆舊版 nx04_quote INSTANT 測試報價。`);
    return;
  }

  if (purge) {
    const del = await prisma.nx04QuoteRecord.deleteMany({ where: { tenantId, remark: MARK } });
    console.log(del.count ? `已清除 ${del.count} 筆測試報價紀錄。` : '沒有測試資料可清除。');
    return;
  }

  const existing = await prisma.nx04QuoteRecord.count({ where: { tenantId, remark: MARK } });
  if (existing > 0 && !force) {
    console.log(`已存在 ${existing} 筆測試報價紀錄；如要再塞請加 --force，或先 --purge 清除。`);
    return;
  }

  const [wh, twd] = await Promise.all([
    prisma.nx01Warehouse.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { code: 'asc' }],
      select: { id: true, code: true },
    }),
    prisma.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }),
  ]);
  if (!wh) throw new Error('找不到可用倉庫');
  if (!twd) throw new Error('找不到 TWD 幣別');

  const custCodes = ['C0020', 'C0030', 'C0035', 'C0042', 'C0048', 'C0049'];
  const userAccounts = ['Y0001', 'Y0002', 'Y0003', 'Y0004', 'Y0005'];
  const partCodes = ['021 115 562 *', '025 260 849B', '023 121 004', '020 941 521A', '06B 133 551L', '020 498 085G', '025 129 638', '025 129 391A'];

  const [custs, users, parts] = await Promise.all([
    prisma.nx01Partner.findMany({ where: { tenantId, code: { in: custCodes } }, select: { id: true, code: true } }),
    prisma.nx01User.findMany({ where: { tenantId, userAccount: { in: userAccounts } }, select: { id: true, userAccount: true } }),
    prisma.nx01Part.findMany({ where: { tenantId, code: { in: partCodes } }, select: { id: true, code: true, name: true } }),
  ]);
  const custBy = new Map(custs.map((c) => [c.code, c.id]));
  const userBy = new Map(users.map((u) => [u.userAccount, u.id]));
  const partBy = new Map(parts.map((p) => [p.code, p]));

  // 10 筆示範：含同客戶同料的「價格記憶」對、量價條件(qty>1)、多位業務、日期分散
  const specs = [
    { cust: 'C0048', user: 'Y0001', part: '021 115 562 *', daysAgo: 0, qty: 1, unitPrice: 320 },
    { cust: 'C0048', user: 'Y0001', part: '021 115 562 *', daysAgo: 8, qty: 10, unitPrice: 295 },
    { cust: 'C0049', user: 'Y0002', part: '025 260 849B', daysAgo: 1, qty: 1, unitPrice: 480 },
    { cust: 'C0020', user: 'Y0003', part: '023 121 004', daysAgo: 3, qty: 1, unitPrice: 1250 },
    { cust: 'C0030', user: 'Y0002', part: '020 941 521A', daysAgo: 5, qty: 2, unitPrice: 210 },
    { cust: 'C0035', user: 'Y0004', part: '06B 133 551L', daysAgo: 6, qty: 4, unitPrice: 1680 },
    { cust: 'C0042', user: 'Y0005', part: '020 498 085G', daysAgo: 10, qty: 1, unitPrice: 95 },
    { cust: 'C0049', user: 'Y0001', part: '025 129 638', daysAgo: 12, qty: 1, unitPrice: 60 },
    { cust: 'C0020', user: 'Y0003', part: '023 121 004', daysAgo: 14, qty: 1, unitPrice: 1180 },
    { cust: 'C0048', user: 'Y0001', part: '025 129 391A', daysAgo: 2, qty: 1, unitPrice: 540 },
  ];

  console.log(`開始塞 ${specs.length} 筆測試報價紀錄（租戶 TW-100001 / 倉 ${wh.code}）…`);
  for (const s of specs) {
    const customerId = custBy.get(s.cust);
    const userId = userBy.get(s.user);
    const part = partBy.get(s.part);
    if (!customerId || !userId || !part) {
      console.warn(`  ⚠ 跳過（查無 ${s.cust}/${s.user}/${s.part}）`);
      continue;
    }
    const recordDate = new Date();
    recordDate.setDate(recordDate.getDate() - s.daysAgo);
    recordDate.setHours(9 + (s.daysAgo % 8), 20, 0, 0);
    await prisma.nx04QuoteRecord.create({
      data: {
        tenantId,
        recordDate,
        customerId,
        partId: part.id,
        partNo: part.code,
        partName: part.name,
        warehouseId: wh.id,
        qty: new Prisma.Decimal(s.qty),
        unitPrice: new Prisma.Decimal(s.unitPrice),
        currencyId: twd.id,
        source: 'INSTANT',
        salesPersonId: userId,
        remark: MARK,
        createdAt: recordDate,
        updatedAt: recordDate,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    console.log(`  ✔ ${s.cust} ${part.code} x${s.qty} @${s.unitPrice}`);
  }
  console.log('完成。');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => disconnectPrisma());
