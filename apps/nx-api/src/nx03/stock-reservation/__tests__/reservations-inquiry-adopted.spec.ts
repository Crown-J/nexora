// apps/nx-api/src/nx03/stock-reservation/__tests__/reservations-inquiry-adopted.spec.ts
// 意圖 v1.1 §5.2 + §4.4：type='G' 已採用 QT（tiId 有值）→ refreshmentDoc.type='inquiry'

import { describe, expect, it } from 'vitest';

import { fakeSoItem, fakeTiRow, fakeUser, makeService } from './test-mocks';

describe("getReservations — type='G' adopted QT (intent v1.1 §4.4 / §5.2)", () => {
  it("type='G' with tiId returns inquiry detail with partner + agreed price", async () => {
    const { svc, prisma } = makeService();
    prisma.nx04SoItem.findMany.mockResolvedValue([
      fakeSoItem({
        transferSourceType: 'G',
        transferStatus: 'C', // 補貨完成
        fulfillStatus: 'W', // 但出貨還沒走 → 仍 reserved
        tiId: 'NX02TIHT0000001',
        ti: fakeTiRow(),
      }),
    ]);
    prisma.nx01User.findMany.mockResolvedValue([
      { id: 'NX01USER0000010', userName: '小李' },
    ]);

    const result = await svc.getReservations(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    expect(result.items).toHaveLength(1);
    const doc = result.items[0].refreshmentDoc;
    expect(doc.type).toBe('inquiry');
    expect(doc.detail).toMatchObject({
      tiId: 'NX02TIHT0000001',
      docNo: 'TI-202604-Z01-00001',
      status: 'D',
      inquiryPartnerId: 'NX01PRTN0000020',
      inquiryPartnerName: '同行 D-O104',
      subtotal: '4000',
    });
  });
});
