// apps/nx-api/src/nx02/qt/__tests__/qt-add.spec.ts
// 意圖 v2 §3.2：addQt 行為單元測試
//   - 第一個 QT 進來 → 推 RFQ DRAFT/SENT → REPLIED
//   - 第二個 QT 進來（RFQ 已 REPLIED）→ status 不動
//   - RFQ 已 CLOSED/CANCELLED → 拒絕

import { Prisma as PrismaNs } from 'db-core';
import { describe, expect, it } from 'vitest';

import { RfqAlreadyClosedError } from '../qt-error';
import { fakeQt, fakeRfq, fakeUser, makeService } from './test-mocks';

describe('addQt — intent v2 §3.2', () => {
  const dto = {
    rfqId: 'NX02RFHT0000001',
    inquiryPartnerId: 'NX01PRTN0000020',
    quotedPrice: 800,
    quotedQuantity: 5,
    leadDays: 3,
  };

  it('first QT pushes RFQ status DRAFT → REPLIED', async () => {
    const { svc, tx } = makeService();
    tx.nx02Rfq.findFirst.mockResolvedValue(fakeRfq({ status: 'DRAFT' }));
    tx.nx01Partner.findFirst.mockResolvedValue({ id: 'NX01PRTN0000020' });
    tx.nx02Qt.create.mockResolvedValue(fakeQt());
    tx.nx02Rfq.update.mockResolvedValue(fakeRfq({ status: 'REPLIED' }));

    await svc.addQt(fakeUser, dto);

    expect(tx.nx02Qt.create).toHaveBeenCalledOnce();
    expect(tx.nx02Rfq.update).toHaveBeenCalledOnce();
    const updateCall = tx.nx02Rfq.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('REPLIED');
    expect(updateCall.where.id).toBe('NX02RFHT0000001');
  });

  it('second QT (RFQ already REPLIED) does NOT change status', async () => {
    const { svc, tx } = makeService();
    tx.nx02Rfq.findFirst.mockResolvedValue(fakeRfq({ status: 'REPLIED' }));
    tx.nx01Partner.findFirst.mockResolvedValue({ id: 'NX01PRTN0000020' });
    tx.nx02Qt.create.mockResolvedValue(fakeQt());

    await svc.addQt(fakeUser, dto);

    expect(tx.nx02Qt.create).toHaveBeenCalledOnce();
    // 已 REPLIED 不再 transition
    expect(tx.nx02Rfq.update).not.toHaveBeenCalled();
  });

  it('throws RfqAlreadyClosedError if RFQ status=CLOSED', async () => {
    const { svc, tx } = makeService();
    tx.nx02Rfq.findFirst.mockResolvedValue(fakeRfq({ status: 'CLOSED' }));

    await expect(svc.addQt(fakeUser, dto)).rejects.toBeInstanceOf(RfqAlreadyClosedError);
    expect(tx.nx02Qt.create).not.toHaveBeenCalled();
  });
});

// Prisma Decimal 模組需要實例化（避免 fakeQt 的虛擬 Decimal 撞 service 內 new PrismaNs.Decimal）
void PrismaNs;
