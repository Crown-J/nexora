// apps/nx-api/src/nx04/so/translator/__tests__/translator-lock-precision.spec.ts
// 意圖 §3.2：advisory lock 鎖到 (tenant, part, warehouse) 三元組精度
import { describe, expect, it } from 'vitest';

import { Nx04AdvisoryLock } from '../../../../shared/nx04/nx04-advisory-lock';

describe('AdvisoryLock — precision (intent §3.2)', () => {
  it('builds keys at (tenant, part, warehouse) granularity', () => {
    const tenantId = 'NX99TANT9900001';
    const items = [
      { partId: 'NX01PART0000001', warehouseId: 'NX01WHHD000001A' },
      { partId: 'NX01PART0000002', warehouseId: 'NX01WHHD000001A' },
    ];
    const keys = Nx04AdvisoryLock.collectUniqueKeys(tenantId, items);
    expect(keys).toEqual([
      { tenantId, partId: 'NX01PART0000001', warehouseId: 'NX01WHHD000001A' },
      { tenantId, partId: 'NX01PART0000002', warehouseId: 'NX01WHHD000001A' },
    ]);
  });

  it('serializes keys with colon separator (matching hashtextextended input)', () => {
    const k = { tenantId: 't', partId: 'p', warehouseId: 'w' };
    expect(Nx04AdvisoryLock.keyToString(k)).toBe('t:p:w');
  });

  it('treats same part in different warehouses as distinct keys (precision is correct)', () => {
    const tenantId = 'T1';
    const items = [
      { partId: 'P', warehouseId: 'W1' },
      { partId: 'P', warehouseId: 'W2' },
    ];
    const keys = Nx04AdvisoryLock.collectUniqueKeys(tenantId, items);
    expect(keys).toHaveLength(2);
  });

  it('treats different tenants as distinct (multi-tenant isolation)', () => {
    const itemsA = Nx04AdvisoryLock.collectUniqueKeys('TA', [{ partId: 'P', warehouseId: 'W' }]);
    const itemsB = Nx04AdvisoryLock.collectUniqueKeys('TB', [{ partId: 'P', warehouseId: 'W' }]);
    expect(itemsA[0].tenantId).not.toBe(itemsB[0].tenantId);
    expect(Nx04AdvisoryLock.keyToString(itemsA[0])).not.toBe(
      Nx04AdvisoryLock.keyToString(itemsB[0]),
    );
  });
});
