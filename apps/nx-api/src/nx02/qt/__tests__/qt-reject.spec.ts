// apps/nx-api/src/nx02/qt/__tests__/qt-reject.spec.ts
// 意圖 v2 §3.4 + §5.4：rejectQt 行為單元測試
//   - rejectReason 必填（schema partial CHECK 對齊；空字串拋 RejectReasonRequiredError）
//   - 拒絕單筆 QT 不影響 RFQ 狀態（仍可收新 QT）

import { describe, expect, it } from 'vitest';

import {
  QtAlreadyAgreedError,
  RejectReasonRequiredError,
} from '../qt-error';
import { fakeQt, fakeUser, makeService } from './test-mocks';

describe('rejectQt — intent v2 §3.4 + §5.4', () => {
  it('throws RejectReasonRequiredError if rejectReason is empty', async () => {
    const { svc, tx } = makeService();

    await expect(
      svc.rejectQt(fakeUser, 'NX02QTHD0000001', { rejectReason: '   ' }),
    ).rejects.toBeInstanceOf(RejectReasonRequiredError);
    expect(tx.nx02Qt.update).not.toHaveBeenCalled();
  });

  it('rejects single QT and does NOT change RFQ status', async () => {
    const { svc, tx } = makeService();
    tx.nx02Qt.findFirst.mockResolvedValue(fakeQt({ status: 'P' }));
    tx.nx02Qt.update.mockResolvedValue(
      fakeQt({ status: 'R', rejectReason: '太貴' }),
    );

    await svc.rejectQt(fakeUser, 'NX02QTHD0000001', { rejectReason: '太貴' });

    expect(tx.nx02Qt.update).toHaveBeenCalledOnce();
    const updateCall = tx.nx02Qt.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('R');
    expect(updateCall.data.rejectReason).toBe('太貴');
    // 重點：不動 RFQ
    expect(tx.nx02Rfq.update).not.toHaveBeenCalled();
  });

  it('throws QtAlreadyAgreedError if QT already agreed', async () => {
    const { svc, tx } = makeService();
    tx.nx02Qt.findFirst.mockResolvedValue(fakeQt({ status: 'A' }));

    await expect(
      svc.rejectQt(fakeUser, 'NX02QTHD0000001', { rejectReason: '太貴' }),
    ).rejects.toBeInstanceOf(QtAlreadyAgreedError);
    expect(tx.nx02Qt.update).not.toHaveBeenCalled();
  });
});
