// apps/nx-api/src/nx02/qt/__tests__/rfq-cancel.spec.ts
// 意圖 v2 §3.5 + §5.4：cancelRfq 行為單元測試
//   - cancelReason 必填
//   - 連帶把所有 status='P' 的 QT 全 reject（reject_reason 自動填系統訊息）
//   - RFQ → CANCELLED + voidedAt 寫入

import { describe, expect, it } from 'vitest';

import { CancelReasonRequiredError } from '../qt-error';
import { fakeRfq, fakeUser, makeService } from './test-mocks';

describe('cancelRfq — intent v2 §3.5 + §5.4', () => {
  it('throws CancelReasonRequiredError if cancelReason is empty', async () => {
    const { svc, tx } = makeService();

    await expect(
      svc.cancelRfq(fakeUser, 'NX02RFHT0000001', { cancelReason: '   ' }),
    ).rejects.toBeInstanceOf(CancelReasonRequiredError);
    expect(tx.nx02Qt.updateMany).not.toHaveBeenCalled();
    expect(tx.nx02Rfq.update).not.toHaveBeenCalled();
  });

  it('marks all pending QTs rejected with system reason and cancels RFQ', async () => {
    const { svc, tx } = makeService();
    tx.nx02Rfq.findFirst.mockResolvedValue(fakeRfq({ status: 'REPLIED' }));
    tx.nx02Qt.updateMany.mockResolvedValue({ count: 3 });
    tx.nx02Rfq.update.mockResolvedValue(fakeRfq({ status: 'CANCELLED' }));

    const result = await svc.cancelRfq(fakeUser, 'NX02RFHT0000001', {
      cancelReason: '客戶取消',
    });

    expect(result).toEqual({ rfqId: 'NX02RFHT0000001', cancelledQtCount: 3 });

    // 連帶 reject
    const updateManyCall = tx.nx02Qt.updateMany.mock.calls[0][0];
    expect(updateManyCall.where).toEqual({ rfqId: 'NX02RFHT0000001', status: 'P' });
    expect(updateManyCall.data.status).toBe('R');
    expect(updateManyCall.data.rejectReason).toContain('因 RFQ 取消：客戶取消');

    // RFQ 標 cancelled + voidedAt 寫入
    const updateCall = tx.nx02Rfq.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('CANCELLED');
    expect(updateCall.data.voidedAt).toBeInstanceOf(Date);
    expect(updateCall.data.voidedBy).toBe('NX01USER0000001');
  });
});
