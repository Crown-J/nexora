// apps/nx-api/src/nx04/so/translator/__tests__/translator-status-init.spec.ts
// 意圖 §3.5：lineItem 的 transferStatus 初始值依 transferSourceType 決定
//   S → C（本倉夠，直接 completed）
//   T/G/B → P → 立即由 RefreshmentDocCreator UPDATE 為 'I'
import { describe, expect, it } from 'vitest';

import { getInitialTransferStatus } from '../translator.service';

describe('Translator transferStatus initial value (intent §3.5)', () => {
  it('self → C (本倉夠不需補貨)', () => {
    expect(getInitialTransferStatus('S')).toBe('C');
  });

  it('transfer → P (待 RefreshmentDocCreator 建 ST 後 UPDATE 為 I)', () => {
    expect(getInitialTransferStatus('T')).toBe('P');
  });

  it('inquiry → P (待 RefreshmentDocCreator 建 RFQ 後 UPDATE 為 I)', () => {
    expect(getInitialTransferStatus('G')).toBe('P');
  });

  it('co → P (待 RefreshmentDocCreator 建 CO 後 UPDATE 為 I)', () => {
    expect(getInitialTransferStatus('B')).toBe('P');
  });
});
