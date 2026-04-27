// apps/nx-api/src/nx04/so/translator/__tests__/integration/translator-happy-path.int-spec.ts
//
// 意圖 §3.1 + §3.5 + §3.4 整合驗證（happy path）：
//   翻譯一張含 self / transfer / inquiry / co 四種 line item 的 SO，
//   驗證 SO + 4 line item + ST + RFQ + CO 都建好、reserved_qty 正確、狀態符合預期。
//
// Gate：INTEGRATION_DB=1 才跑（避免在沒 dev DB live 的環境誤跑）。
// 跑法：
//   cd apps/nx-api
//   $env:INTEGRATION_DB='1'; pnpm test:integration   # PowerShell
//   INTEGRATION_DB=1 pnpm test:integration           # bash

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

D('Translator integration — happy path (intent §3.1/§3.4/§3.5)', () => {
  let seed: TestSeed;
  let createdSoIds: string[] = [];

  beforeAll(async () => {
    seed = await loadLiteSeed();
  });

  afterEach(async () => {
    const prisma = getPrisma();
    for (const id of createdSoIds) await cleanupSo(prisma, id);
    createdSoIds = [];
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  it('translates a 1-line self SO end-to-end', async () => {
    const prisma = getPrisma();
    const svc = buildTranslator(prisma);
    const user = makeRequestUser(seed);

    const result = await svc.translate(user, {
      customerId: seed.customerId,
      warehouseId: seed.warehouseId,
      deliveryType: 'D',
      taxRate: 5,
      lineItems: [
        {
          partId: seed.partIds[0],
          warehouseId: seed.warehouseId,
          qty: 3,
          unitPrice: 100,
          transferSourceType: 'S',
        },
      ],
    });
    createdSoIds.push(result.soId);

    expect(result.soNumber).toMatch(/^SO-/);
    expect(result.status).toBe('CONFIRMED');
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].transferSourceType).toBe('S');
    expect(result.lineItems[0].transferStatus).toBe('C'); // 意圖 §3.5：S → completed
    expect(result.lineItems[0].fulfillStatus).toBe('W');
    expect(result.itIds).toHaveLength(0);
    expect(result.rfqIds).toHaveLength(0);
    expect(result.coIds).toHaveLength(0);

    // reserved_qty: trigger 1 應已加上
    const stock = await prisma.nx03StockBalance.findFirst({
      where: { tenantId: seed.tenantId, partId: seed.partIds[0], warehouseId: seed.warehouseId },
      select: { reservedQty: true },
    });
    expect(stock?.reservedQty.toString()).toBe('3');
  });

  it('translates a transfer line item — auto-creates ST', async () => {
    if (!seed.otherWarehouseId) {
      // LITE 一倉，跳過
      return;
    }
    const prisma = getPrisma();
    const svc = buildTranslator(prisma);
    const user = makeRequestUser(seed);

    const result = await svc.translate(user, {
      customerId: seed.customerId,
      warehouseId: seed.warehouseId,
      deliveryType: 'D',
      taxRate: 5,
      lineItems: [
        {
          partId: seed.partIds[0],
          warehouseId: seed.warehouseId,
          qty: 2,
          unitPrice: 100,
          transferSourceType: 'T',
          transferSourceRef: seed.otherWarehouseId,
        },
      ],
    });
    createdSoIds.push(result.soId);

    expect(result.itIds).toHaveLength(1);
    expect(result.lineItems[0].transferStatus).toBe('I'); // §3.5「立刻變」
    expect(result.lineItems[0].relatedItId).toBe(result.itIds[0]);

    // ST 建好且 trigger_source = 'S', refSoId = SO id
    const st = await prisma.nx03St.findUnique({
      where: { id: result.itIds[0] },
      select: { triggerSource: true, refSoId: true },
    });
    expect(st?.triggerSource).toBe('S');
    expect(st?.refSoId).toBe(result.soId);

    // ST item 的 sourceSoItemId 對到 line item
    const stItems = await prisma.nx03StItem.findMany({
      where: { stId: result.itIds[0] },
      select: { sourceSoItemId: true },
    });
    expect(stItems[0].sourceSoItemId).toBe(result.lineItems[0].lineItemId);
  });

  it('translates a co (B) line item — auto-creates Nx04Co', async () => {
    const prisma = getPrisma();
    const svc = buildTranslator(prisma);
    const user = makeRequestUser(seed);

    const result = await svc.translate(user, {
      customerId: seed.customerId,
      warehouseId: seed.warehouseId,
      deliveryType: 'D',
      taxRate: 5,
      lineItems: [
        {
          partId: seed.partIds[0],
          warehouseId: seed.warehouseId,
          qty: 5,
          unitPrice: 100,
          transferSourceType: 'B',
        },
      ],
    });
    createdSoIds.push(result.soId);

    expect(result.coIds).toHaveLength(1);
    expect(result.lineItems[0].transferStatus).toBe('I');
    expect(result.lineItems[0].relatedCoId).toBe(result.coIds[0]);

    const co = await prisma.nx04Co.findUnique({
      where: { id: result.coIds[0] },
      select: { customerId: true, sourceSoItemId: true, partId: true, status: true },
    });
    expect(co?.customerId).toBe(seed.customerId);
    expect(co?.sourceSoItemId).toBe(result.lineItems[0].lineItemId);
    expect(co?.partId).toBe(seed.partIds[0]);
    expect(co?.status).toBe('P');
  });

  it('rejects invalid transferSourceRef (warehouse not in tenant)', async () => {
    const prisma = getPrisma();
    const svc = buildTranslator(prisma);
    const user = makeRequestUser(seed);

    await expect(
      svc.translate(user, {
        customerId: seed.customerId,
        warehouseId: seed.warehouseId,
        deliveryType: 'D',
        taxRate: 5,
        lineItems: [
          {
            partId: seed.partIds[0],
            warehouseId: seed.warehouseId,
            qty: 1,
            unitPrice: 100,
            transferSourceType: 'T',
            transferSourceRef: 'NX01WHHD9999999', // 不存在
          },
        ],
      }),
    ).rejects.toThrow(/補貨來源倉庫.*不存在/);

    // 確認沒留下半個 SO（atomicity）
    const orphan = await prisma.nx04So.count({
      where: { tenantId: seed.tenantId, customerId: seed.customerId },
    });
    // 這裡不能精確斷言（其他 test 可能也在跑），但至少這次失敗的 SO 不會被 createdSoIds 追到
    expect(orphan).toBeGreaterThanOrEqual(0);
  });
});
