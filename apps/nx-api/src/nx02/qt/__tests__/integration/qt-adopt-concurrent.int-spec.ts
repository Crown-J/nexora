// apps/nx-api/src/nx02/qt/__tests__/integration/qt-adopt-concurrent.int-spec.ts
// 意圖 v2 §5.3 整合驗證（並發控制）：
//   兩個採購同時對同一 RFQ 採用不同 QT → advisory lock 序列化，
//   一個成功變 'A'、另一個拋 RfqAlreadyClosedError 或 QtAlreadyRejectedError。
//
// Gate：INTEGRATION_DB=1 才跑。

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  buildRfqScenario,
  buildSvc,
  cleanupScenario,
  disconnectPrisma,
  getPrisma,
  INTEGRATION_GATE,
  loadOrCreateB5Fixture,
  makeRequestUser,
  type B5Fixture,
  type B5Scenario,
} from './test-helpers';

const D = INTEGRATION_GATE ? describe : describe.skip;

D('B5 adoptQt — concurrent control (intent v2 §5.3)', () => {
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

  it('two parallel adopts on same RFQ — one wins, other gets a conflict error (no double-adopt)', async () => {
    const prisma = getPrisma();
    const svc = buildSvc(prisma);
    const user = makeRequestUser(fixture);

    const sc = await buildRfqScenario(prisma, fixture);
    scenarios.push(sc);

    const qtA = await svc.addQt(user, {
      rfqId: sc.rfqId,
      inquiryPartnerId: fixture.inquiryPartnerXId,
      quotedPrice: 800,
      quotedQuantity: 5,
    });
    const qtB = await svc.addQt(user, {
      rfqId: sc.rfqId,
      inquiryPartnerId: fixture.inquiryPartnerYId,
      quotedPrice: 900,
      quotedQuantity: 5,
    });

    // 兩個 service 同時對同 RFQ 採用不同 QT
    const [resA, resB] = await Promise.allSettled([
      svc.adoptQt(user, qtA.id),
      svc.adoptQt(user, qtB.id),
    ]);

    // 一個 fulfilled、一個 rejected（advisory lock 序列化後第二個發現 RFQ 已 CLOSED 或 QT 已 'R'）
    const fulfilled = [resA, resB].filter((r) => r.status === 'fulfilled');
    const rejected = [resA, resB].filter((r) => r.status === 'rejected');
    if (fulfilled.length !== 1 || rejected.length !== 1) {
      // 失敗時印出實際 reason 幫 debug
      console.error('resA:', resA);
      console.error('resB:', resB);
    }
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // 驗證：恰好一個 QT 是 'A'，RFQ 是 CLOSED，TI 只建一張
    const qts = await prisma.nx02Qt.findMany({
      where: { rfqId: sc.rfqId },
      select: { status: true },
    });
    const agreedCount = qts.filter((q) => q.status === 'A').length;
    expect(agreedCount).toBe(1);

    const rfq = await prisma.nx02Rfq.findFirst({
      where: { id: sc.rfqId },
      select: { status: true },
    });
    expect(rfq?.status).toBe('CLOSED');

    const tiCount = await prisma.nx02Ti.count({ where: { rfqId: sc.rfqId } });
    expect(tiCount).toBe(1);
  });
});
