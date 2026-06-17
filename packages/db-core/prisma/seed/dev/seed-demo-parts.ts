// packages/db-core/prisma/seed/dev/seed-demo-parts.ts
// 開發用一次性 demo 料號 + 庫存 seed（執行長 2026-06-17 拍板、給 F2 料號即時搜尋測試用）
//
// 跑法（從 repo root）：
//   pnpm --filter db-core tsx prisma/seed/dev/seed-demo-parts.ts
// 或從 packages/db-core：
//   pnpm tsx prisma/seed/dev/seed-demo-parts.ts
//
// 不掛主 seed flow、純 idempotent（upsert by tenantId+code+countryId）；
// 重跑不會壞既有資料、只會同步 demo 12 筆。
//
// 預設目標：LITE 測試租戶（TEST_LITE_TENANT_ID = NX99TANT9900001）。
//
// 注音搜尋：本 seed 不寫 phonetic_index；Crown 想啟用注音搜尋的話、
//   用 admin 帳號 POST /nx01/phonetic-dictionary/rebuild-index 一次重建即可。
//   （或品名 contains 模糊搜已可用、不需注音）

import { disconnectPrisma, prisma } from '../client';
import { TEST_LITE_ADMIN_USER_ID, TEST_LITE_TENANT_ID } from '../test/constants';

const TENANT_ID = TEST_LITE_TENANT_ID;
const ACTOR_ID = TEST_LITE_ADMIN_USER_ID;

type DemoPart = {
  code: string;
  name: string;
  spec: string | null;
  brandCode: string;
  partGroupCode: string;
  secCode: string | null;
  isOem: boolean;
  cost: number;
  stockOnHand: number;
};

const DEMO_PARTS: DemoPart[] = [
  { code: 'DEMO-NGK-001', name: '火星塞 NGK ILZKR7B11',          spec: 'VAG 2.0 TFSI',       brandCode: 'NGK', partGroupCode: 'ENGINE',   secCode: 'ILZKR7B11',         isOem: true,  cost: 420,  stockOnHand: 48 },
  { code: 'DEMO-BOS-001', name: '火星塞 BOSCH FR7NPP332',        spec: 'VAG 2.0 TFSI',       brandCode: 'BOS', partGroupCode: 'ENGINE',   secCode: 'FR7NPP332',         isOem: false, cost: 350,  stockOnHand: 12 },
  { code: 'DEMO-MAN-001', name: '機油濾芯 MANN HU712/9X',        spec: 'VAG 1.8/2.0 TFSI',   brandCode: 'MAN', partGroupCode: 'FILTER',   secCode: 'HU712/9X',          isOem: false, cost: 220,  stockOnHand: 60 },
  { code: 'DEMO-MAN-002', name: '空氣濾芯 MANN C 25 011',        spec: 'VAG 1.8/2.0 TFSI',   brandCode: 'MAN', partGroupCode: 'FILTER',   secCode: 'C25011',            isOem: false, cost: 180,  stockOnHand: 35 },
  { code: 'DEMO-ATE-L',   name: '剎車片 ATE 前左 13.0460',       spec: 'Golf 7 / A4 B8',     brandCode: 'ATE', partGroupCode: 'BRAKE',    secCode: '13.0460-7195.2',    isOem: false, cost: 1280, stockOnHand: 8  },
  { code: 'DEMO-ATE-R',   name: '剎車片 ATE 前右 13.0460',       spec: 'Golf 7 / A4 B8',     brandCode: 'ATE', partGroupCode: 'BRAKE',    secCode: '13.0460-7195.3',    isOem: false, cost: 1280, stockOnHand: 8  },
  { code: 'DEMO-BOS-002', name: '雨刷 BOSCH AeroTwin AR21U',     spec: 'Universal 21"',      brandCode: 'BOS', partGroupCode: 'BODY',     secCode: 'AR21U',             isOem: false, cost: 480,  stockOnHand: 25 },
  { code: 'DEMO-HEL-001', name: '前燈泡 HELLA H7 Standard',      spec: '12V 55W',            brandCode: 'HEL', partGroupCode: 'ELECTRIC', secCode: 'H7-12V-55W',        isOem: false, cost: 220,  stockOnHand: 40 },
  { code: 'DEMO-LEM-L',   name: '引擎腳 LEMFORDER 左 35976 01',  spec: 'VAG 2.0 TFSI 6MT',   brandCode: 'LEM', partGroupCode: 'ENGINE',   secCode: '35976-01',          isOem: false, cost: 2800, stockOnHand: 3  },
  { code: 'DEMO-LEM-R',   name: '引擎腳 LEMFORDER 右 35976 02',  spec: 'VAG 2.0 TFSI 6MT',   brandCode: 'LEM', partGroupCode: 'ENGINE',   secCode: '35976-02',          isOem: false, cost: 2800, stockOnHand: 3  },
  { code: 'DEMO-VAG-001', name: '節溫器 VAG 06H 121 026 AT',     spec: 'VAG 2.0 TFSI',       brandCode: 'VAG', partGroupCode: 'ENGINE',   secCode: '06H 121 026 AT',    isOem: true,  cost: 1850, stockOnHand: 5  },
  { code: 'DEMO-GEN-001', name: '機油 5W30 (1L)',                spec: '通用、API SN',       brandCode: 'GEN', partGroupCode: 'OTHER',    secCode: '5W30-1L',           isOem: false, cost: 280,  stockOnHand: 120 },
];

// 相關零件（PartRelation 雙向、Q3=A 不分子類型；用 relationType 2=同款示範）
const DEMO_RELATIONS: Array<{ fromCode: string; toCode: string; relationType: number; remark: string }> = [
  { fromCode: 'DEMO-ATE-L',   toCode: 'DEMO-ATE-R',   relationType: 2, remark: '同款剎車片左右配對' },
  { fromCode: 'DEMO-LEM-L',   toCode: 'DEMO-LEM-R',   relationType: 2, remark: '同款引擎腳左右配對' },
  { fromCode: 'DEMO-NGK-001', toCode: 'DEMO-BOS-001', relationType: 2, remark: '火星塞 OE vs 副廠互換' },
];

async function main(): Promise<void> {
  console.log(`▶ [DEV-SEED] 開始建立 demo 料號（tenant=${TENANT_ID}）...`);

  // 1. 確保 tenant 存在
  const tenant = await prisma.nx99Tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    throw new Error(
      `tenant ${TENANT_ID} not found；請先跑 pnpm --filter db-core db:seed 建立 LITE 測試租戶`,
    );
  }

  // 2. 撈主檔 id map
  const brands = await prisma.nx01Brand.findMany({
    where: { tenantId: TENANT_ID, isPart: true },
    select: { id: true, code: true },
  });
  const brandIdByCode = new Map(brands.map((b) => [b.code, b.id] as const));

  const groups = await prisma.nx01PartGroup.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, code: true },
  });
  const groupIdByCode = new Map(groups.map((g) => [g.code, g.id] as const));

  const warehouse = await prisma.nx01Warehouse.findFirst({
    where: { tenantId: TENANT_ID, isActive: true },
    orderBy: { sortNo: 'asc' },
    select: { id: true, code: true },
  });
  if (!warehouse) {
    throw new Error(`tenant ${TENANT_ID} 沒有任何 active warehouse；請先跑主 seed`);
  }
  console.log(`   使用倉庫：${warehouse.code} (${warehouse.id})`);

  // 3. upsert demo parts + stock balance
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const partIdByCode = new Map<string, string>();

  for (const p of DEMO_PARTS) {
    const brandId = brandIdByCode.get(p.brandCode) ?? null;
    const partGroupId = groupIdByCode.get(p.partGroupCode) ?? null;
    if (!brandId) {
      console.warn(`⚠ skip ${p.code}: brand "${p.brandCode}" 不存在（須先 applyPartBrand）`);
      skipped++;
      continue;
    }

    const existing = await prisma.nx01Part.findFirst({
      where: { tenantId: TENANT_ID, code: p.code, countryId: null },
      select: { id: true },
    });

    let partId: string;
    if (existing) {
      const row = await prisma.nx01Part.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          spec: p.spec,
          isOem: p.isOem,
          secCode: p.secCode,
          brandId,
          partGroupId,
          cost: p.cost,
          updatedBy: ACTOR_ID,
        },
        select: { id: true },
      });
      partId = row.id;
      updated++;
    } else {
      const row = await prisma.nx01Part.create({
        data: {
          tenantId: TENANT_ID,
          code: p.code,
          name: p.name,
          spec: p.spec,
          isOem: p.isOem,
          secCode: p.secCode,
          brandId,
          partGroupId,
          cost: p.cost,
          uom: 'pcs',
          isActive: true,
          returnPolicy: 'S',
          warrantyMonths: 0,
          createdBy: ACTOR_ID,
          updatedBy: ACTOR_ID,
        },
        select: { id: true },
      });
      partId = row.id;
      created++;
    }
    partIdByCode.set(p.code, partId);

    // upsert stock balance（單倉、available = onHand - reserved）
    await prisma.nx03StockBalance.upsert({
      where: {
        tenantId_partId_warehouseId: {
          tenantId: TENANT_ID,
          partId,
          warehouseId: warehouse.id,
        },
      },
      create: {
        tenantId: TENANT_ID,
        partId,
        warehouseId: warehouse.id,
        onHandQty: p.stockOnHand,
        reservedQty: 0,
        availableQty: p.stockOnHand,
        inTransitQty: 0,
        avgCost: p.cost,
        stockValue: p.stockOnHand * p.cost,
        isActive: true,
        createdBy: ACTOR_ID,
        updatedBy: ACTOR_ID,
      },
      update: {
        onHandQty: p.stockOnHand,
        availableQty: p.stockOnHand,
        avgCost: p.cost,
        stockValue: p.stockOnHand * p.cost,
        updatedBy: ACTOR_ID,
      },
    });
  }

  // 4. upsert demo PartRelation
  let relCreated = 0;
  let relSkipped = 0;
  for (const r of DEMO_RELATIONS) {
    const fromId = partIdByCode.get(r.fromCode);
    const toId = partIdByCode.get(r.toCode);
    if (!fromId || !toId) {
      relSkipped++;
      continue;
    }
    const existing = await prisma.nx01PartRelation.findFirst({
      where: {
        tenantId: TENANT_ID,
        partIdFrom: fromId,
        partIdTo: toId,
        relationType: r.relationType,
      },
      select: { id: true },
    });
    if (!existing) {
      await prisma.nx01PartRelation.create({
        data: {
          tenantId: TENANT_ID,
          partIdFrom: fromId,
          partIdTo: toId,
          relationType: r.relationType,
          remark: r.remark,
          sortNo: 0,
          isActive: true,
          createdBy: ACTOR_ID,
          updatedBy: ACTOR_ID,
        },
      });
      relCreated++;
    }
  }

  console.log('');
  console.log(`✅ [DEV-SEED] demo 料號：${created} 新建 / ${updated} 更新 / ${skipped} 跳過（共 ${DEMO_PARTS.length}）`);
  console.log(`✅ [DEV-SEED] demo 相關零件關係：${relCreated} 新建 / ${relSkipped} 跳過`);
  console.log('');
  console.log('💡 可測搜尋條件範例：');
  console.log('   品名輸入「火星塞」→ 應出 2 筆（NGK / BOSCH）');
  console.log('   品名輸入「機油」→ 應出 2 筆（濾芯 / 機油 5W30）');
  console.log('   料號輸入「DEMO-ATE」→ 應出 2 筆（左/右剎車片）');
  console.log('   族群選「ENGINE」→ 應出 5 筆（火星塞×2 + 引擎腳×2 + 節溫器）');
  console.log('   廠牌選「BOSCH」→ 應出 2 筆（火星塞+雨刷）');
  console.log('');
  console.log('💡 注音搜尋：用 admin 帳號 POST /nx01/phonetic-dictionary/rebuild-index 一次性重建');
}

main()
  .catch((e) => {
    console.error('❌ [DEV-SEED] failed:', e);
    process.exit(1);
  })
  .finally(() => disconnectPrisma());
