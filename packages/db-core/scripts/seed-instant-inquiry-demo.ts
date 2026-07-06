// packages/db-core/scripts/seed-instant-inquiry-demo.ts
// 一次性測試資料：對 TW-100001（恆迎）塞詢價紀錄表（nx04_inquiry_record，調貨/同行側），供「詢價紀錄」頁預覽。
//   帶測試標記 remark，--purge 一鍵清除；重跑預設會擋，--force 強制。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';

const MARK = '【測試】即時詢價示範';

async function main() {
  const purge = process.argv.includes('--purge');
  const force = process.argv.includes('--force');

  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  if (!t) throw new Error('租戶 TW-100001 不存在');
  const tenantId = t.id;

  if (purge) {
    const del = await prisma.nx04InquiryRecord.deleteMany({ where: { tenantId, remark: MARK } });
    console.log(del.count ? `已清除 ${del.count} 筆測試詢價紀錄。` : '沒有測試資料可清除。');
    return;
  }

  const existing = await prisma.nx04InquiryRecord.count({ where: { tenantId, remark: MARK } });
  if (existing > 0 && !force) {
    console.log(`已存在 ${existing} 筆測試詢價紀錄；如要再塞請加 --force，或先 --purge。`);
    return;
  }

  const [wh, twd] = await Promise.all([
    prisma.nx01Warehouse.findFirst({ where: { tenantId, isActive: true }, orderBy: [{ isMain: 'desc' }, { code: 'asc' }], select: { id: true } }),
    prisma.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }),
  ]);
  if (!wh || !twd) throw new Error('找不到倉庫 / TWD');

  const partnerCodes = ['O0007', 'O0012', 'O0013', 'O0017', 'O0019'];
  const userAccounts = ['Y0001', 'Y0002', 'Y0003'];
  const partCodes = ['021 115 562 *', '023 121 004', '06B 133 551L', '025 260 849B', '020 498 085G'];

  const [partners, users, parts] = await Promise.all([
    prisma.nx01Partner.findMany({ where: { tenantId, code: { in: partnerCodes } }, select: { id: true, code: true } }),
    prisma.nx01User.findMany({ where: { tenantId, userAccount: { in: userAccounts } }, select: { id: true, userAccount: true } }),
    prisma.nx01Part.findMany({ where: { tenantId, code: { in: partCodes } }, select: { id: true, code: true, name: true } }),
  ]);
  const pBy = new Map(partners.map((p) => [p.code, p.id]));
  const uBy = new Map(users.map((u) => [u.userAccount, u.id]));
  const partBy = new Map(parts.map((p) => [p.code, p]));

  // 8 筆：含同料不同同行（比調貨成本）、量價、多業務、日期分散
  const specs = [
    { partner: 'O0007', user: 'Y0001', part: '021 115 562 *', daysAgo: 0, qty: 1, unitPrice: 265 },
    { partner: 'O0012', user: 'Y0001', part: '021 115 562 *', daysAgo: 1, qty: 10, unitPrice: 250 },
    { partner: 'O0013', user: 'Y0002', part: '023 121 004', daysAgo: 2, qty: 1, unitPrice: 1050 },
    { partner: 'O0017', user: 'Y0002', part: '023 121 004', daysAgo: 4, qty: 1, unitPrice: 998 },
    { partner: 'O0019', user: 'Y0003', part: '06B 133 551L', daysAgo: 5, qty: 2, unitPrice: 1490 },
    { partner: 'O0007', user: 'Y0001', part: '025 260 849B', daysAgo: 7, qty: 1, unitPrice: 405 },
    { partner: 'O0013', user: 'Y0003', part: '020 498 085G', daysAgo: 9, qty: 1, unitPrice: 78 },
    { partner: 'O0012', user: 'Y0002', part: '06B 133 551L', daysAgo: 11, qty: 1, unitPrice: 1550 },
  ];

  console.log(`開始塞 ${specs.length} 筆測試詢價紀錄（租戶 TW-100001）…`);
  for (const s of specs) {
    const sourcePartnerId = pBy.get(s.partner);
    const userId = uBy.get(s.user);
    const part = partBy.get(s.part);
    if (!sourcePartnerId || !userId || !part) {
      console.warn(`  ⚠ 跳過（查無 ${s.partner}/${s.user}/${s.part}）`);
      continue;
    }
    const recordDate = new Date();
    recordDate.setDate(recordDate.getDate() - s.daysAgo);
    recordDate.setHours(10 + (s.daysAgo % 7), 15, 0, 0);
    await prisma.nx04InquiryRecord.create({
      data: {
        tenantId,
        recordDate,
        sourcePartnerId,
        partId: part.id,
        partNo: part.code,
        partName: part.name,
        warehouseId: wh.id,
        qty: new Prisma.Decimal(s.qty),
        unitPrice: new Prisma.Decimal(s.unitPrice),
        currencyId: twd.id,
        salesPersonId: userId,
        remark: MARK,
        createdAt: recordDate,
        updatedAt: recordDate,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    console.log(`  ✔ ${s.partner} ${part.code} x${s.qty} @${s.unitPrice}`);
  }
  console.log('完成。');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
