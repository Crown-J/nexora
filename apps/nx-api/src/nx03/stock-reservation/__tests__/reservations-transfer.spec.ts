// apps/nx-api/src/nx03/stock-reservation/__tests__/reservations-transfer.spec.ts
// 意圖 v1.1 §5.2：type='T' 自倉調撥 → refreshmentDoc.type='transfer' with from/to warehouse

import { describe, expect, it } from 'vitest';

import { fakeSoItem, fakeStRow, fakeUser, makeService } from './test-mocks';

describe("getReservations — type='T' (intent v1.1 §5.2)", () => {
  it("type='T' returns transfer detail with fromWarehouse + toWarehouse", async () => {
    const { svc, prisma } = makeService();
    prisma.nx04SoItem.findMany.mockResolvedValue([
      fakeSoItem({
        transferSourceType: 'T',
        transferStatus: 'I',
        fulfillStatus: 'W',
        stId: 'NX03STHD0000001',
        st: fakeStRow(),
      }),
    ]);
    prisma.nx01User.findMany.mockResolvedValue([
      { id: 'NX01USER0000010', userName: '老王' },
    ]);

    const result = await svc.getReservations(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    expect(result.items).toHaveLength(1);
    const doc = result.items[0].refreshmentDoc;
    expect(doc.type).toBe('transfer');
    expect(doc.detail).toMatchObject({
      stId: 'NX03STHD0000001',
      docNo: 'ST-202604-Z01-00001',
      status: 'TRANSIT',
      fromWarehouseId: 'NX01WHHD0000002',
      fromWarehouseName: '北倉 B',
      toWarehouseId: 'NX01WHHD0000001',
      toWarehouseName: '主倉',
    });
  });
});
