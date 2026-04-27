// apps/nx-api/src/nx02/qt/__tests__/integration/qt-adopt-multi-history.int-spec.ts
// 意圖 v2 §5.5 整合驗證（同 partner 多筆 QT 採用）：
//   建 RFQ + 4 個 QT（partner X 三筆，partner Y 一筆），採用 X 的最新 QT，
//   驗證 X 較舊兩筆 + Y 一筆都標 'R'，且 reject_reason 都填入系統訊息。
//   同時驗證 SO line item 反查 update（透過 RFQ.sourceSoItemId）。
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

D('B5 adoptQt — multi-history scenario (intent v2 §5.5)', () => {
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

  it('adopt newest QT for partner X — both X older + Y QT are rejected with system reason', async () => {
    const prisma = getPrisma();
    const svc = buildSvc(prisma);
    const user = makeRequestUser(fixture);

    const sc = await buildRfqScenario(prisma, fixture);
    scenarios.push(sc);

    // 建 4 個 QT：X 三筆（不同價）、Y 一筆
    const qtX1 = await svc.addQt(user, {
      rfqId: sc.rfqId,
      inquiryPartnerId: fixture.inquiryPartnerXId,
      quotedPrice: 800,
      quotedQuantity: 5,
    });
    const qtX2 = await svc.addQt(user, {
      rfqId: sc.rfqId,
      inquiryPartnerId: fixture.inquiryPartnerXId,
      quotedPrice: 850, // X 漲價（歷史保留）
      quotedQuantity: 5,
    });
    const qtY1 = await svc.addQt(user, {
      rfqId: sc.rfqId,
      inquiryPartnerId: fixture.inquiryPartnerYId,
      quotedPrice: 900,
      quotedQuantity: 5,
    });
    const qtX3 = await svc.addQt(user, {
      rfqId: sc.rfqId,
      inquiryPartnerId: fixture.inquiryPartnerXId,
      quotedPrice: 780, // X 最新降價（採購要採用這筆）
      quotedQuantity: 5,
    });

    // 採用 X 最新筆（QT X3）
    const result = await svc.adoptQt(user, qtX3.id);

    expect(result.qtId).toBe(qtX3.id);
    expect(result.rejectedSiblingCount).toBe(3); // X1 + X2 + Y1 全 reject
    expect(result.linkedSoItemId).toBe(sc.soItemId);
    expect(result.tiDocNo).toMatch(/^TI-\d{6}-/);

    // 驗證 DB 狀態
    const allQts = await prisma.nx02Qt.findMany({
      where: { rfqId: sc.rfqId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, rejectReason: true, inquiryPartnerId: true },
    });
    expect(allQts).toHaveLength(4);

    const byId = new Map(allQts.map((q) => [q.id, q]));
    // X3 = AGREED
    expect(byId.get(qtX3.id)?.status).toBe('A');
    expect(byId.get(qtX3.id)?.rejectReason).toBeNull();
    // X1 = REJECTED with system reason
    expect(byId.get(qtX1.id)?.status).toBe('R');
    expect(byId.get(qtX1.id)?.rejectReason).toContain(`因採用 QT-${qtX3.id}`);
    // X2 = REJECTED
    expect(byId.get(qtX2.id)?.status).toBe('R');
    expect(byId.get(qtX2.id)?.rejectReason).toContain(`因採用 QT-${qtX3.id}`);
    // Y1 = REJECTED
    expect(byId.get(qtY1.id)?.status).toBe('R');
    expect(byId.get(qtY1.id)?.rejectReason).toContain(`因採用 QT-${qtX3.id}`);

    // RFQ → CLOSED
    const rfq = await prisma.nx02Rfq.findFirst({
      where: { id: sc.rfqId },
      select: { status: true },
    });
    expect(rfq?.status).toBe('CLOSED');

    // SO line item 反查 update
    const soItem = await prisma.nx04SoItem.findFirst({
      where: { id: sc.soItemId },
      select: { tiId: true, transferStatus: true },
    });
    expect(soItem?.tiId).toBe(result.tiId);
    expect(soItem?.transferStatus).toBe('C');

    // TI header + item 都建好
    const ti = await prisma.nx02Ti.findFirst({
      where: { id: result.tiId },
      select: { id: true, partnerId: true, rfqId: true, subtotal: true },
    });
    expect(ti?.partnerId).toBe(fixture.inquiryPartnerXId);
    expect(ti?.rfqId).toBe(sc.rfqId);
    expect(Number(ti?.subtotal)).toBe(780 * 5); // X3 quotedPrice * quotedQuantity
  });
});
