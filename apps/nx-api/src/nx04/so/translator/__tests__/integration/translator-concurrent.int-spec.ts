// apps/nx-api/src/nx04/so/translator/__tests__/integration/translator-concurrent.int-spec.ts
//
// 意圖 §3.2 + §3.3 整合驗證（並發保護）：
//   兩個 translator 同時送同 (tenant, part, warehouse) 的 SO，
//   驗證 advisory lock 序列化，最終 reserved_qty == 兩筆 qty 和（無 race lost）。
//
// Gate：INTEGRATION_DB=1 才跑。

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  INTEGRATION_GATE,
  buildTranslator,
  cleanupSo,
  disconnectPrisma,
  getPrisma,
  loadLiteSeed,
  makeRequestUser,
  type TestSeed,
} from './test-helpers';

const D = INTEGRATION_GATE ? describe : describe.skip;

D('Translator integration — concurrent (intent §3.2/§3.3)', () => {
  let seed: TestSeed;
  const createdSoIds: string[] = [];

  beforeAll(async () => {
    seed = await loadLiteSeed();
  });

  afterEach(async () => {
    const prisma = getPrisma();
    while (createdSoIds.length > 0) {
      const id = createdSoIds.pop()!;
      await cleanupSo(prisma, id);
    }
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  it('two parallel SOs on same (tenant, part, warehouse) serialize correctly', async () => {
    const prisma = getPrisma();
    const svcA = buildTranslator(prisma);
    const svcB = buildTranslator(prisma);
    const user = makeRequestUser(seed);

    const partId = seed.partIds[0];
    const warehouseId = seed.warehouseId;

    // 抓 baseline reserved_qty
    const before = await prisma.nx03StockBalance.findFirst({
      where: { tenantId: seed.tenantId, partId, warehouseId },
      select: { reservedQty: true },
    });
    const baseline = before ? Number(before.reservedQty.toString()) : 0;

    const buildDto = (qty: number) => ({
      customerId: seed.customerId,
      warehouseId,
      deliveryType: 'D',
      taxRate: 5,
      lineItems: [
        { partId, warehouseId, qty, unitPrice: 100, transferSourceType: 'S' as const },
      ],
    });

    // 同時送 A=4, B=3
    const [resA, resB] = await Promise.all([svcA.translate(user, buildDto(4)), svcB.translate(user, buildDto(3))]);
    createdSoIds.push(resA.soId, resB.soId);

    expect(resA.soNumber).not.toBe(resB.soNumber);

    // reserved_qty 應該是 baseline + 4 + 3（沒掉任何一筆）
    const after = await prisma.nx03StockBalance.findFirst({
      where: { tenantId: seed.tenantId, partId, warehouseId },
      select: { reservedQty: true },
    });
    const finalQty = Number(after!.reservedQty.toString());
    expect(finalQty).toBe(baseline + 7);
  });

  it('lock is per (tenant, part, warehouse) — different parts run truly parallel', async () => {
    if (seed.partIds.length < 2) return;
    const prisma = getPrisma();
    const svcA = buildTranslator(prisma);
    const svcB = buildTranslator(prisma);
    const user = makeRequestUser(seed);

    const buildDto = (partId: string, qty: number) => ({
      customerId: seed.customerId,
      warehouseId: seed.warehouseId,
      deliveryType: 'D',
      taxRate: 5,
      lineItems: [
        {
          partId,
          warehouseId: seed.warehouseId,
          qty,
          unitPrice: 100,
          transferSourceType: 'S' as const,
        },
      ],
    });

    const t0 = Date.now();
    const [resA, resB] = await Promise.all([
      svcA.translate(user, buildDto(seed.partIds[0], 2)),
      svcB.translate(user, buildDto(seed.partIds[1], 2)),
    ]);
    const elapsed = Date.now() - t0;
    createdSoIds.push(resA.soId, resB.soId);

    // 兩個不同 part 應該真平行（不用相互等 lock），總耗時 < 兩倍單筆 + buffer
    // 單筆翻譯通常 < 500ms；兩筆並行 < 1500ms 即代表 lock 沒互卡
    expect(elapsed).toBeLessThan(2000);
  });
});
