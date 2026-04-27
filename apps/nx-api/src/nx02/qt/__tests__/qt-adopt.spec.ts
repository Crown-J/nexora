// apps/nx-api/src/nx02/qt/__tests__/qt-adopt.spec.ts
// 意圖 v2 §3.3 + §5.5：adoptQt 行為單元測試
//   - 採用 QT 後同 RFQ 其他 pending QT 全標 rejected（含同 partner 較舊歷史，§5.5）
//   - QT 已 'A' 狀態 → 拋 QtAlreadyAgreedError，不重複採用
//   - 採用後建 TI + 反查並 update SO line item

import { Prisma as PrismaNs } from 'db-core';
import { describe, expect, it } from 'vitest';

import { QtAlreadyAgreedError, RfqNotTransferInquiryError } from '../qt-error';
import { fakeQt, fakeRfq, fakeUser, makeService } from './test-mocks';

const decimal = (v: string) => new PrismaNs.Decimal(v);

function happyPathMocks(tx: ReturnType<typeof makeService>['tx']) {
  // QT load (pre + post lock)
  tx.nx02Qt.findFirst.mockResolvedValue(
    fakeQt({
      status: 'P',
      quotedPrice: decimal('800'),
      quotedQuantity: decimal('5'),
    }),
  );
  // RFQ load
  tx.nx02Rfq.findFirst.mockResolvedValue(fakeRfq({ status: 'REPLIED', rfqType: 'P' }));
  // QT update (set 'A')
  tx.nx02Qt.update.mockResolvedValue(
    fakeQt({
      status: 'A',
      quotedPrice: decimal('800'),
      quotedQuantity: decimal('5'),
    }),
  );
  // 兄弟 reject
  tx.nx02Qt.updateMany.mockResolvedValue({ count: 2 });
  // RFQ → CLOSED
  tx.nx02Rfq.update.mockResolvedValue(fakeRfq({ status: 'CLOSED' }));
  // createTi 內部
  tx.nx01Warehouse.findFirst.mockResolvedValue({ code: 'Z01' });
  tx.nx02RfqItem.findFirst.mockResolvedValue({
    id: 'NX02RFIT0000001',
    partId: 'NX01PART0000001',
    partNo: 'P-001',
    partName: '料號 P-001',
  });
  tx.nx02Ti.findFirst.mockResolvedValue(null); // 第一個 TI
  tx.nx01Currency.findFirst.mockResolvedValue({ id: 'NX01CURR0000001', code: 'TWD' });
  tx.nx02Ti.create.mockResolvedValue({ id: 'NX02TIHT0000001', docNo: 'TI-202604-Z01-00001' });
  tx.nx02TiItem.create.mockResolvedValue({});
  tx.nx04SoItem.update.mockResolvedValue({});
}

describe('adoptQt — intent v2 §3.3 + §5.5', () => {
  it('marks all sibling pending QTs rejected with system reason ("因採用 QT-...")', async () => {
    const { svc, tx } = makeService();
    happyPathMocks(tx);

    await svc.adoptQt(fakeUser, 'NX02QTHD0000001');

    expect(tx.nx02Qt.updateMany).toHaveBeenCalledOnce();
    const updateManyCall = tx.nx02Qt.updateMany.mock.calls[0][0];
    expect(updateManyCall.where).toEqual({
      rfqId: 'NX02RFHT0000001',
      status: 'P',
      id: { not: 'NX02QTHD0000001' },
    });
    expect(updateManyCall.data.status).toBe('R');
    expect(updateManyCall.data.rejectReason).toContain('因採用 QT-NX02QTHD0000001');

    // 確認 RFQ → CLOSED
    expect(tx.nx02Rfq.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'NX02RFHT0000001' },
        data: expect.objectContaining({ status: 'CLOSED' }),
      }),
    );

    // 確認 SO line item 反查 update（rfq.sourceSoItemId = 'NX04SOIT0000001'）
    expect(tx.nx04SoItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'NX04SOIT0000001' },
        data: expect.objectContaining({ tiId: 'NX02TIHT0000001', transferStatus: 'C' }),
      }),
    );
  });

  it('throws QtAlreadyAgreedError if QT.status=A; no further DB writes', async () => {
    const { svc, tx } = makeService();
    tx.nx02Qt.findFirst.mockResolvedValue(fakeQt({ status: 'A' }));

    await expect(svc.adoptQt(fakeUser, 'NX02QTHD0000001')).rejects.toBeInstanceOf(
      QtAlreadyAgreedError,
    );
    expect(tx.nx02Qt.update).not.toHaveBeenCalled();
    expect(tx.nx02Qt.updateMany).not.toHaveBeenCalled();
    expect(tx.nx02Ti.create).not.toHaveBeenCalled();
    expect(tx.nx04SoItem.update).not.toHaveBeenCalled();
  });

  it('throws RfqNotTransferInquiryError if RFQ.rfqType≠P (一般詢價走 PO 不在 B5 範圍)', async () => {
    const { svc, tx } = makeService();
    tx.nx02Qt.findFirst.mockResolvedValue(
      fakeQt({ status: 'P', quotedPrice: decimal('800'), quotedQuantity: decimal('5') }),
    );
    tx.nx02Rfq.findFirst.mockResolvedValue(fakeRfq({ status: 'REPLIED', rfqType: 'G' }));

    await expect(svc.adoptQt(fakeUser, 'NX02QTHD0000001')).rejects.toBeInstanceOf(
      RfqNotTransferInquiryError,
    );
    expect(tx.nx02Ti.create).not.toHaveBeenCalled();
  });
});
