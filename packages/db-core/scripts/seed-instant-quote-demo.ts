// packages/db-core/scripts/seed-instant-quote-demo.ts
// 一次性測試資料：對 TW-100001（恆迎）塞即時報價紀錄（source=INSTANT），供「報價紀錄」頁預覽。
//   鏡像 nx-api QuoteService.create() 的欄位邏輯：單號產生器 / 金額結算 / 單行明細 / validUntil。
//   帶測試標記 remark，可用 --purge 一鍵清除。重跑預設會擋（已存在測試資料時）；--force 強制再塞。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';

const MARK = '【測試】即時報價示範';

// 單號產生器（鏡像 apps/nx-api/src/shared/nx04/nx04-doc-no.ts）
async function allocQtDocNo(tenantId: string, warehouseCode: string): Promise<string> {
  const y = new Date();
  const yyyymm = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `QT-${yyyymm}-${warehouseCode}-`;
  const last = await prisma.nx04Quote.findFirst({
    where: { tenantId, docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });
  let next = 1;
  if (last?.docNo) {
    const num = parseInt(last.docNo.split('-').pop() ?? '', 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

// 塞單一即時報價（單行）：完整鏡像 create() 的欄位
async function seedOne(spec: {
  tenantId: string;
  custId: string;
  userId: string;
  whId: string;
  whCode: string;
  currencyId: string;
  partId: string;
  partNo: string;
  partName: string;
  daysAgo: number;
  qty: number;
  unitPrice: number;
  validityDays: number;
}) {
  const quoteDate = new Date();
  quoteDate.setDate(quoteDate.getDate() - spec.daysAgo);
  quoteDate.setHours(9 + (spec.daysAgo % 8), 20, 0, 0); // 分散建單時間
  const validUntil = new Date(quoteDate);
  validUntil.setDate(validUntil.getDate() + spec.validityDays);

  const qty = new Prisma.Decimal(spec.qty);
  const unit = new Prisma.Decimal(spec.unitPrice);
  const lineAmount = qty.mul(unit).toDecimalPlaces(2);
  const taxRate = new Prisma.Decimal(5);
  const tax = lineAmount.mul(taxRate).div(100).toDecimalPlaces(2);
  const total = lineAmount.add(tax);

  await prisma.$transaction(async (tx) => {
    const docNo = await allocQtDocNo(spec.tenantId, spec.whCode);
    const quote = await tx.nx04Quote.create({
      data: {
        tenantId: spec.tenantId,
        docNo,
        warehouseId: spec.whId,
        quoteDate,
        customerId: spec.custId,
        customerGradeId: null,
        salesPersonId: spec.userId,
        source: 'INSTANT',
        validUntil,
        currencyId: spec.currencyId,
        taxRate,
        subtotal: lineAmount,
        taxAmount: tax,
        totalAmount: total,
        status: 'DRAFT',
        remark: MARK,
        createdAt: quoteDate,
        updatedAt: quoteDate,
        createdBy: spec.userId,
        updatedBy: spec.userId,
      },
      select: { id: true, docNo: true },
    });
    await tx.nx04QuoteItem.create({
      data: {
        quoteId: quote.id,
        lineNo: 1,
        partId: spec.partId,
        partNo: spec.partNo,
        partName: spec.partName,
        qty,
        unitPrice: unit,
        minPrice: null,
        lineAmount,
        isSelected: true,
        remark: null,
        createdAt: quoteDate,
        updatedAt: quoteDate,
        createdBy: spec.userId,
        updatedBy: spec.userId,
      },
    });
    console.log(`  ✔ ${quote.docNo}  ${spec.partNo}  x${spec.qty} @${spec.unitPrice}`);
  });
}

async function main() {
  const purge = process.argv.includes('--purge');
  const force = process.argv.includes('--force');

  const t = await prisma.nx99Tenant.findFirst({
    where: { code: 'TW-100001' },
    select: { id: true, quoteDefaultValidityDays: true },
  });
  if (!t) throw new Error('租戶 TW-100001 不存在');
  const tenantId = t.id;
  const validityDays = t.quoteDefaultValidityDays ?? 30;

  if (purge) {
    // 先刪 item 再刪 header（測試標記為準）
    const marked = await prisma.nx04Quote.findMany({
      where: { tenantId, source: 'INSTANT', remark: MARK },
      select: { id: true },
    });
    const ids = marked.map((m) => m.id);
    if (!ids.length) {
      console.log('沒有測試資料可清除。');
      return;
    }
    await prisma.nx04QuoteItem.deleteMany({ where: { quoteId: { in: ids } } });
    const del = await prisma.nx04Quote.deleteMany({ where: { id: { in: ids } } });
    console.log(`已清除 ${del.count} 筆測試即時報價。`);
    return;
  }

  const existing = await prisma.nx04Quote.count({ where: { tenantId, source: 'INSTANT', remark: MARK } });
  if (existing > 0 && !force) {
    console.log(`已存在 ${existing} 筆測試即時報價；如要再塞請加 --force，或先 --purge 清除。`);
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

  // 依 code 取具體 客戶 / 業務 / 零件（穩定、不靠 take 順序）
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

  console.log(`開始塞 ${specs.length} 筆測試即時報價（租戶 TW-100001 / 倉 ${wh.code}）…`);
  for (const s of specs) {
    const custId = custBy.get(s.cust);
    const userId = userBy.get(s.user);
    const part = partBy.get(s.part);
    if (!custId || !userId || !part) {
      console.warn(`  ⚠ 跳過（查無 ${s.cust}/${s.user}/${s.part}）`);
      continue;
    }
    await seedOne({
      tenantId,
      custId,
      userId,
      whId: wh.id,
      whCode: wh.code,
      currencyId: twd.id,
      partId: part.id,
      partNo: part.code,
      partName: part.name,
      daysAgo: s.daysAgo,
      qty: s.qty,
      unitPrice: s.unitPrice,
      validityDays,
    });
  }
  console.log('完成。');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => disconnectPrisma());
