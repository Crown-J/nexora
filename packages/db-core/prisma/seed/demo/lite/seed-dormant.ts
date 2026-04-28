// packages/db-core/prisma/seed/demo/lite/seed-dormant.ts
// @FUNCTION_CODE SYS-DEMO-LITE-003-F01
// LITE dormant 期 5.5 月歷史 SO（每週 ~1 筆 = ~30 筆）
//
// 全部 transferSourceType='S' / transferStatus='C' / fulfillStatus='F'（已完成、不佔 reserved_qty）
// 用途：給 W2-mini 業務查料號時看到「半年前客戶 X 買過幾個」的歷史感

import { dateToYyyymm, randomDormantDate } from '../lib/anchor-date';
import { ensureSo, makeDemoDocNo, type DemoContext } from '../lib/builders';
import type { MasterResult } from './seed-master';

const LITE_DORMANT_SO_COUNT = 30;

export async function seedLiteDormant(
  ctx: DemoContext,
  tenantCode: 'LITE',
  master: MasterResult,
): Promise<{ soCount: number }> {
  const { customers, parts, locations } = master;
  const wh = ctx.warehouses[0]; // LITE 單倉
  const locForWh = locations.find((l) => l.warehouseId === wh.id);
  if (!locForWh) throw new Error('LITE no location for primary warehouse');

  let soCount = 0;
  for (let i = 0; i < LITE_DORMANT_SO_COUNT; i++) {
    const idxSeed = i + 1;
    const customer = customers[idxSeed % customers.length];
    const soDate = randomDormantDate(idxSeed * 31);
    // 1~2 line items
    const lineItemCount = 1 + (idxSeed % 2);
    const lineItems = [];
    for (let li = 0; li < lineItemCount; li++) {
      const part = parts[(idxSeed * 7 + li * 11) % parts.length];
      const qty = 1 + (idxSeed * 3 + li) % 5; // 1~5
      lineItems.push({
        partId: part.id,
        partNo: part.code,
        partName: part.name,
        warehouseId: wh.id,
        locationId: locForWh.id,
        qty,
        unitPrice: part.unitPrice,
        transferSourceType: 'S' as const,
        transferStatus: 'C' as const, // dormant 已完成
        fulfillStatus: 'F' as const,
      });
    }

    const docNo = makeDemoDocNo('SO', wh.code, i + 1, dateToYyyymm(soDate));
    await ensureSo(ctx, {
      docNo,
      customerId: customer.id,
      soDate,
      warehouseId: wh.id,
      status: 'INVOICED',
      lineItems,
    });
    soCount++;
  }

  return { soCount };
}
