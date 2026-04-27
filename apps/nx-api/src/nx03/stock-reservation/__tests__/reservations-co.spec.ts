// apps/nx-api/src/nx03/stock-reservation/__tests__/reservations-co.spec.ts
// 意圖 v1.1 §5.2：type='B' 客戶訂單 → refreshmentDoc.type='co' with customer
// （CO 是客戶向我們訂貨，對象是客戶；意圖 v1.1 已修正命名）

import { describe, expect, it } from 'vitest';

import { fakeCoRow, fakeSoItem, fakeUser, makeService } from './test-mocks';

describe("getReservations — type='B' (intent v1.1 §5.2)", () => {
  it("type='B' returns co detail with customer (not vendor)", async () => {
    const { svc, prisma } = makeService();
    prisma.nx04SoItem.findMany.mockResolvedValue([
      fakeSoItem({
        transferSourceType: 'B',
        transferStatus: 'I',
        fulfillStatus: 'W',
        coId: 'NX04COHD0000001',
        co: fakeCoRow(),
      }),
    ]);
    prisma.nx01User.findMany.mockResolvedValue([
      { id: 'NX01USER0000010', userName: '老王' },
    ]);

    const result = await svc.getReservations(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    expect(result.items).toHaveLength(1);
    const doc = result.items[0].refreshmentDoc;
    expect(doc.type).toBe('co');
    expect(doc.detail).toMatchObject({
      coId: 'NX04COHD0000001',
      docNo: 'CO-202604-Z01-00001',
      status: 'P',
      customerId: 'NX01PRTN0000001',
      customerName: '測試客戶 ABC',
    });
    // 不應該有 vendorPartnerId / vendorPartnerName（意圖 v1.1 修正）
    expect(doc.detail).not.toHaveProperty('vendorPartnerId');
    expect(doc.detail).not.toHaveProperty('vendorPartnerName');
  });
});
