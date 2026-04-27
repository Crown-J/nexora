// apps/nx-api/src/nx03/stock-reservation/__tests__/reservations-inquiry-pending.spec.ts
// 意圖 v1.1 §4.4：type='G' 中間態（tiId=null）→ 走 rev_Nx02Rfq_sourceSoItemId 反查
// detail 含 rfqId/docNo/rfqStatus/qtCount/partnerCount

import { describe, expect, it } from 'vitest';

import { fakeRfqRow, fakeSoItem, fakeUser, makeService } from './test-mocks';

describe("getReservations — type='G' pending (intent v1.1 §4.4)", () => {
  it("type='G' with tiId=null returns inquiry_pending with qtCount + partnerCount via RFQ lookup", async () => {
    const { svc, prisma } = makeService();
    prisma.nx04SoItem.findMany.mockResolvedValue([
      fakeSoItem({
        transferSourceType: 'G',
        transferStatus: 'I',
        fulfillStatus: 'W',
        tiId: null, // ← 中間態
        ti: null,
        rev_Nx02Rfq_sourceSoItemId: [
          fakeRfqRow({
            qts: [
              // partner X 兩筆 + partner Y 一筆 = 3 QT、2 distinct partners
              { inquiryPartnerId: 'NX01PRTN0000020', status: 'P' },
              { inquiryPartnerId: 'NX01PRTN0000020', status: 'P' },
              { inquiryPartnerId: 'NX01PRTN0000021', status: 'P' },
            ],
          }),
        ],
      }),
    ]);
    prisma.nx01User.findMany.mockResolvedValue([
      { id: 'NX01USER0000010', userName: '小李' },
    ]);

    const result = await svc.getReservations(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    expect(result.items).toHaveLength(1);
    const doc = result.items[0].refreshmentDoc;
    expect(doc.type).toBe('inquiry_pending');
    expect(doc.detail).toEqual({
      rfqId: 'NX02RFHT0000001',
      docNo: 'RF-202604-Z01-00001',
      rfqStatus: 'REPLIED',
      qtCount: 3,
      partnerCount: 2, // distinct partner 數
    });
  });

  it("type='G' with tiId=null but no RFQ row returns inquiry_pending with null detail (defensive)", async () => {
    const { svc, prisma } = makeService();
    prisma.nx04SoItem.findMany.mockResolvedValue([
      fakeSoItem({
        transferSourceType: 'G',
        transferStatus: 'I',
        fulfillStatus: 'W',
        tiId: null,
        ti: null,
        rev_Nx02Rfq_sourceSoItemId: [], // ← 異常容錯：理論不應發生
      }),
    ]);
    prisma.nx01User.findMany.mockResolvedValue([
      { id: 'NX01USER0000010', userName: '小李' },
    ]);

    const result = await svc.getReservations(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    expect(result.items[0].refreshmentDoc).toEqual({
      type: 'inquiry_pending',
      detail: null,
    });
  });
});
