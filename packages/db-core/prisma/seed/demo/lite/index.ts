// packages/db-core/prisma/seed/demo/lite/index.ts
// @FUNCTION_CODE SYS-DEMO-LITE-001-F01
// LITE 誠心汽修 DEMO-02 主入口
//
// 結構：
//   1. seedLiteMaster：8 客戶 + 5 同行 + 13 part_brand + 13 brand_code_rule + 50 part + 5 location + 50 stock_balance
//   2. seedLiteDormant：5.5 月 ~30 筆 SO
//   3. seedLiteBusy：7 天 ~15 筆 SO + 5 RFQ + 10 QT + 3 TI + 2 CO

import type { PrismaClient } from '../../../../generated/prisma';

import { TEST_LITE_ADMIN_USER_ID, TEST_LITE_TENANT_ID } from '../../test/constants';
import type { DemoContext } from '../lib/builders';
import { seedLiteMaster } from './seed-master';
import { seedLiteDormant } from './seed-dormant';
import { seedLiteBusy } from './seed-busy';

const TENANT_CODE = 'LITE';

export async function seedLiteDemo(prisma: PrismaClient): Promise<void> {
  console.log('▶ [DEMO-02/LITE] 開始建立 LITE 誠心汽修 demo 資料...');

  // 1. 建 DemoContext（warehouses / grades / part_brand_ids / currency / tax）
  const warehouses = await prisma.nx01Warehouse.findMany({
    where: { tenantId: TEST_LITE_TENANT_ID, isActive: true },
    orderBy: { code: 'asc' },
    select: { id: true, code: true },
  });
  if (warehouses.length === 0) {
    throw new Error('LITE 沒 warehouse — 先跑 pnpm seed:test:lite');
  }

  // template seed 建的 customer_grade code 是 A/B/C/D（A=VIP / B=好客戶 / C=一般 / D=觀察）
  const grades = await prisma.nx01CustomerGrade.findMany({
    where: { tenantId: TEST_LITE_TENANT_ID },
    select: { id: true, code: true },
  });
  const gradeByCode = (code: string) => grades.find((g) => g.code === code)?.id ?? grades[0].id;
  const gradeMap: { vip: string; good: string; normal: string; observe: string } = {
    vip: gradeByCode('A'),
    good: gradeByCode('B'),
    normal: gradeByCode('C'),
    observe: gradeByCode('D'),
  };

  const twd = await prisma.nx01Currency.findFirst({
    where: { code: 'TWD' },
    select: { id: true },
  });
  if (!twd) throw new Error('TWD currency not seeded — run pnpm seed:system');

  const ctx: DemoContext = {
    prisma,
    tenantId: TEST_LITE_TENANT_ID,
    adminUserId: TEST_LITE_ADMIN_USER_ID,
    warehouses,
    grades: gradeMap,
    partBrandIds: {}, // master seed 階段填入（建 13 個 demo part_brand 後）
    twdId: twd.id,
    taxRate: 5,
  };

  // 2. master 主檔
  const master = await seedLiteMaster(ctx, TENANT_CODE);
  console.log(`✅ [DEMO-02/LITE] master: ${master.customers.length} 客戶 / ${master.inquiryPartners.length} 同行 / ${master.parts.length} 料號 / ${master.locations.length} 庫位 / ${master.stockBalanceCount} 起帳存`);

  // 3. dormant 5.5 月歷史
  const dormant = await seedLiteDormant(ctx, TENANT_CODE, master);
  console.log(`✅ [DEMO-02/LITE] dormant: ${dormant.soCount} 筆 SO`);

  // 4. busy 7 天異常情境
  const busy = await seedLiteBusy(ctx, TENANT_CODE, master);
  console.log(`✅ [DEMO-02/LITE] busy: ${busy.soCount} 筆 SO / ${busy.rfqCount} RFQ / ${busy.qtCount} QT / ${busy.tiCount} TI / ${busy.coCount} CO`);

  console.log('✅ [DEMO-02/LITE] LITE 誠心汽修 demo 資料建立完成');
}
