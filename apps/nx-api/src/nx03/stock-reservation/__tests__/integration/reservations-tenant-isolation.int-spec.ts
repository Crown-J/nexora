// apps/nx-api/src/nx03/stock-reservation/__tests__/integration/reservations-tenant-isolation.int-spec.ts
// 意圖 v1.1 §5.5 整合驗證：multi-tenant 隔離
//   建 LITE 租戶內的 SO + RFQ stub → 用 LITE user 看得到、用 (假) 別租戶 user 看不到
//
// Gate：INTEGRATION_DB=1 才跑。

import { Logger } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  buildRfqScenario,
  cleanupScenario,
  disconnectPrisma,
  getPrisma,
  INTEGRATION_GATE,
  loadOrCreateB5Fixture,
  type B5Fixture,
  type B5Scenario,
} from '../../../../nx02/qt/__tests__/integration/test-helpers';
import { Nx03StockReservationService } from '../../stock-reservation.service';

const D = INTEGRATION_GATE ? describe : describe.skip;

D('B2 stock-reservation — multi-tenant isolation (intent v1.1 §5.5)', () => {
  let fixture: B5Fixture;
  const scenarios: B5Scenario[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();
    fixture = await loadOrCreateB5Fixture(prisma);
  });

  afterEach(async () => {
    const prisma = getPrisma();
    while (scenarios.length > 0) {
      const s = scenarios.pop()!;
      await cleanupScenario(prisma, s);
    }
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  it('LITE tenant user sees their own reservation; alien tenant user sees nothing', async () => {
    const prisma = getPrisma();
    const svc = new Nx03StockReservationService(prisma as never);
    Reflect.set(svc, 'logger', new Logger(Nx03StockReservationService.name));

    // 建 LITE 租戶的 SO line item + RFQ stub（type='G' 中間態，含 sourceSoItemId）
    const sc = await buildRfqScenario(prisma, fixture);
    scenarios.push(sc);

    // ✅ LITE user 應該看到這筆（用 soItemId 匹配，避免 leftover fixture 干擾 count）
    const liteUser = {
      sub: fixture.userId,
      username: 'lite-tester',
      roles: ['ADMIN'],
      tenantId: fixture.tenantId,
      tenantCode: 'TEST-LITE',
      planCode: 'LITE',
    } as never;
    const liteResult = await svc.getReservations(liteUser, fixture.partId, fixture.warehouseId);
    const myItem = liteResult.items.find((it) => it.soLineItem.id === sc.soItemId);
    expect(myItem).toBeDefined();
    expect(myItem!.refreshmentDoc.type).toBe('inquiry_pending');

    // ❌ 假 tenant user 不該看到（驗證 multi-tenant 隔離）
    const alienUser = {
      sub: fixture.userId,
      username: 'alien-tester',
      roles: ['ADMIN'],
      tenantId: 'NX99TANT9999999', // 不存在的 tenant
      tenantCode: 'ALIEN',
      planCode: 'LITE',
    } as never;
    const alienResult = await svc.getReservations(alienUser, fixture.partId, fixture.warehouseId);
    expect(alienResult.items).toHaveLength(0);
  });
});
