// apps/nx-api/src/nx03/stock-reservation/__tests__/reservations-self.spec.ts
// 意圖 v1.1 §5.2：type='S' 本倉夠不需補貨 → refreshmentDoc.type='self', detail=null

import { describe, expect, it } from 'vitest';

import { fakeSoItem, fakeUser, makeService } from './test-mocks';

describe("getReservations — type='S' (intent v1.1 §5.2)", () => {
  it("type='S' returns refreshmentDoc.type='self' with null detail", async () => {
    const { svc, prisma } = makeService();
    prisma.nx04SoItem.findMany.mockResolvedValue([
      fakeSoItem({
        transferSourceType: 'S',
        transferStatus: 'I', // 仍未完成（雖 self 但 fulfill 還沒走完）
        fulfillStatus: 'PK',
      }),
    ]);
    prisma.nx01User.findMany.mockResolvedValue([
      { id: 'NX01USER0000010', userName: '老王' },
    ]);

    const result = await svc.getReservations(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].refreshmentDoc).toEqual({ type: 'self', detail: null });
    expect(result.items[0].so.creatorName).toBe('老王');
    expect(result.items[0].so.creatorId).toBe('NX01USER0000010');
    expect(result.items[0].so.customerName).toBe('測試客戶 ABC');
  });
});
