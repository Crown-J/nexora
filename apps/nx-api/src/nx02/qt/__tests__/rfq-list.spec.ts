// apps/nx-api/src/nx02/qt/__tests__/rfq-list.spec.ts
// 意圖 v2 §3.1：listRfqsForPurchase 行為單元測試
//   - 回傳 qtCount + distinctPartnerCount（從 groupBy 算）

import { describe, expect, it } from 'vitest';

import { fakeUser, makeService } from './test-mocks';

describe('listRfqsForPurchase — intent v2 §3.1', () => {
  it('returns qtCount and distinctPartnerCount per RFQ from groupBy', async () => {
    const { svc, prisma } = makeService();

    prisma.nx02Rfq.count.mockResolvedValue(2);
    prisma.nx02Rfq.findMany.mockResolvedValue([
      {
        id: 'NX02RFHT0000001',
        tenantId: 'NX99TENT0000001',
        docNo: 'RF-202604-Z01-00001',
        rfqDate: new Date('2026-04-27'),
        warehouseId: 'NX01WHHD0000001',
        supplierId: null,
        status: 'REPLIED',
        rfqType: 'P',
        rfqReason: 'T',
        currency: 'TWD',
        sourceSoItemId: 'NX04SOIT0000001',
        voidedAt: null,
        createdAt: new Date('2026-04-27'),
        rev_Nx02RfqItem_rfqId: [
          {
            partId: 'NX01PART0000001',
            partNo: 'P-001',
            partName: '料號 P-001',
            qty: { toString: () => '5' },
          },
        ],
      },
      {
        id: 'NX02RFHT0000002',
        tenantId: 'NX99TENT0000001',
        docNo: 'RF-202604-Z01-00002',
        rfqDate: new Date('2026-04-27'),
        warehouseId: 'NX01WHHD0000001',
        supplierId: null,
        status: 'DRAFT',
        rfqType: 'P',
        rfqReason: 'T',
        currency: 'TWD',
        sourceSoItemId: 'NX04SOIT0000002',
        voidedAt: null,
        createdAt: new Date('2026-04-27'),
        rev_Nx02RfqItem_rfqId: [],
      },
    ]);

    // RFQ #1 有 3 筆 QT 跨 2 個 partner，RFQ #2 沒 QT
    prisma.nx02Qt.groupBy.mockResolvedValue([
      { rfqId: 'NX02RFHT0000001', inquiryPartnerId: 'NX01PRTN0000020', _count: { _all: 2 } },
      { rfqId: 'NX02RFHT0000001', inquiryPartnerId: 'NX01PRTN0000021', _count: { _all: 1 } },
    ]);

    const result = await svc.listRfqsForPurchase(fakeUser, { page: 1, pageSize: 20 });

    expect(result.total).toBe(2);
    expect(result.rows).toHaveLength(2);
    // RFQ #1: 3 QTs across 2 distinct partners
    expect(result.rows[0].qtCount).toBe(3);
    expect(result.rows[0].distinctPartnerCount).toBe(2);
    // RFQ #2: 0 QTs / 0 partners
    expect(result.rows[1].qtCount).toBe(0);
    expect(result.rows[1].distinctPartnerCount).toBe(0);
  });
});
