// apps/nx-api/src/nx03/stock-reservation/__tests__/reservations-sort-and-filter.spec.ts
// 意圖 v1.1 §4.1 / §4.3 / §5.4：
//   - 過濾：transferStatus != 'C' OR fulfillStatus != 'F'
//   - 排序：expectedDeliveryDate ASC NULLS LAST + soDate ASC + docNo ASC

import { describe, expect, it } from 'vitest';

import { fakeUser, makeService } from './test-mocks';

describe('getReservations — sort + filter (intent v1.1 §4.1 / §4.3 / §5.4)', () => {
  it('sends correct where clause and orderBy to Prisma findMany', async () => {
    const { svc, prisma } = makeService();
    prisma.nx04SoItem.findMany.mockResolvedValue([]);

    await svc.getReservations(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    expect(prisma.nx04SoItem.findMany).toHaveBeenCalledOnce();
    const args = prisma.nx04SoItem.findMany.mock.calls[0][0];

    // §4.1 「未完成」過濾：transferStatus != 'C' OR fulfillStatus != 'F'
    expect(args.where).toMatchObject({
      partId: 'NX01PART0000001',
      warehouseId: 'NX01WHHD0000001',
      so: { tenantId: 'NX99TENT0000001' },
      OR: [
        { transferStatus: { not: 'C' } },
        { fulfillStatus: { not: 'F' } },
      ],
    });

    // §4.3 / §5.4 排序：expectedDeliveryDate ASC NULLS LAST + soDate ASC + docNo ASC
    expect(args.orderBy).toEqual([
      { so: { expectedDeliveryDate: { sort: 'asc', nulls: 'last' } } },
      { so: { soDate: 'asc' } },
      { so: { docNo: 'asc' } },
    ]);
  });

  it('returns empty items array when no SoItem matches', async () => {
    const { svc, prisma } = makeService();
    prisma.nx04SoItem.findMany.mockResolvedValue([]);

    const result = await svc.getReservations(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    expect(result).toEqual({
      partId: 'NX01PART0000001',
      warehouseId: 'NX01WHHD0000001',
      items: [],
    });
    // 沒 SoItem 不應呼叫 user lookup
    expect(prisma.nx01User.findMany).not.toHaveBeenCalled();
  });

  it('user lookup uses IN with deduplicated createdBy ids (no N+1)', async () => {
    const { svc, prisma } = makeService();
    const sampleSoItem = (id: string, createdBy: string, transferSourceType = 'S') => ({
      id,
      soId: `SO-${id}`,
      partId: 'NX01PART0000001',
      warehouseId: 'NX01WHHD0000001',
      qty: { toString: () => '5' },
      transferSourceType,
      transferStatus: 'I',
      fulfillStatus: 'W',
      stId: null,
      tiId: null,
      coId: null,
      so: {
        id: `SO-${id}`,
        docNo: `SO-202604-Z01-${id}`,
        soDate: new Date('2026-04-25'),
        status: 'CONFIRMED',
        expectedDeliveryDate: new Date('2026-05-01'),
        createdBy,
        customer: { id: 'NX01PRTN0000001', name: '客戶' },
      },
      st: null,
      ti: null,
      co: null,
      rev_Nx02Rfq_sourceSoItemId: [],
    });

    // 3 筆 SoItem 但只有 2 個 distinct createdBy
    prisma.nx04SoItem.findMany.mockResolvedValue([
      sampleSoItem('001', 'NX01USER0000010'),
      sampleSoItem('002', 'NX01USER0000020'),
      sampleSoItem('003', 'NX01USER0000010'), // 重複
    ]);
    prisma.nx01User.findMany.mockResolvedValue([
      { id: 'NX01USER0000010', userName: '老王' },
      { id: 'NX01USER0000020', userName: '小李' },
    ]);

    await svc.getReservations(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    // 一次呼叫，IN 含 distinct ids
    expect(prisma.nx01User.findMany).toHaveBeenCalledOnce();
    const userArgs = prisma.nx01User.findMany.mock.calls[0][0];
    expect(userArgs.where).toMatchObject({
      tenantId: 'NX99TENT0000001',
    });
    expect(userArgs.where.id.in).toHaveLength(2); // distinct
    expect(userArgs.where.id.in).toEqual(
      expect.arrayContaining(['NX01USER0000010', 'NX01USER0000020']),
    );
  });
});
