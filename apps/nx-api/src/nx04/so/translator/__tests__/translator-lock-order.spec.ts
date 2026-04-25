// apps/nx-api/src/nx04/so/translator/__tests__/translator-lock-order.spec.ts
// 意圖 §3.3：取 lock 前先排序 lineItem，所有 SO 用同樣順序 → 不會 deadlock
import { describe, expect, it, vi } from 'vitest';

import { Nx04AdvisoryLock, type LockKey } from '../../../../shared/nx04/nx04-advisory-lock';

describe('AdvisoryLock — sort order (intent §3.3)', () => {
  it('returns keys sorted by partId:warehouseId字典序', () => {
    const tenantId = 'T';
    const shuffled = [
      { partId: 'PartZ', warehouseId: 'WhB' },
      { partId: 'PartA', warehouseId: 'WhB' },
      { partId: 'PartA', warehouseId: 'WhA' },
      { partId: 'PartM', warehouseId: 'WhA' },
    ];
    const sorted = Nx04AdvisoryLock.collectUniqueKeys(tenantId, shuffled);
    const ordered = sorted.map(Nx04AdvisoryLock.keyToString);
    expect(ordered).toEqual([
      'T:PartA:WhA',
      'T:PartA:WhB',
      'T:PartM:WhA',
      'T:PartZ:WhB',
    ]);
  });

  it('two SOs with same set of (part, warehouse) input in different order produce identical lock sequences', () => {
    const tenantId = 'T';
    const soA = [
      { partId: 'P1', warehouseId: 'W1' },
      { partId: 'P2', warehouseId: 'W1' },
    ];
    const soB = [
      { partId: 'P2', warehouseId: 'W1' },
      { partId: 'P1', warehouseId: 'W1' },
    ];
    const keysA = Nx04AdvisoryLock.collectUniqueKeys(tenantId, soA);
    const keysB = Nx04AdvisoryLock.collectUniqueKeys(tenantId, soB);
    expect(keysA.map(Nx04AdvisoryLock.keyToString)).toEqual(
      keysB.map(Nx04AdvisoryLock.keyToString),
    );
  });

  it('dedups same key (same part+warehouse referenced twice in line items)', () => {
    const tenantId = 'T';
    const items = [
      { partId: 'P', warehouseId: 'W' },
      { partId: 'P', warehouseId: 'W' }, // duplicate
      { partId: 'P', warehouseId: 'W' }, // duplicate
    ];
    expect(Nx04AdvisoryLock.collectUniqueKeys(tenantId, items)).toHaveLength(1);
  });

  it('passes sorted keys to acquireXactLocks', async () => {
    const exec = vi.fn().mockResolvedValue(0);
    const tx = {
      $executeRawUnsafe: exec,
      $executeRaw: exec,
    } as unknown as Parameters<typeof Nx04AdvisoryLock.acquireXactLocks>[0];

    const keys: LockKey[] = [
      { tenantId: 'T', partId: 'PZ', warehouseId: 'W' },
      { tenantId: 'T', partId: 'PA', warehouseId: 'W' },
    ];
    await Nx04AdvisoryLock.acquireXactLocks(tx, keys);

    // 第一條為 SET LOCAL lock_timeout
    expect(exec.mock.calls[0]?.[0]).toMatch(/SET LOCAL lock_timeout/);
    // 後續為 advisory lock — 順序按 sort 後（PA 先於 PZ）
    const lockCalls = exec.mock.calls.slice(1);
    expect(lockCalls.length).toBe(2);
    // tagged-template 的 raw call signature 是 ([strings, ...values])，第二個值是 partId
    const partIds: string[] = [];
    for (const call of lockCalls) {
      // call[0] 可能是 string[] (Prisma TemplateStringsArray) 或 SQL string
      const args = call.slice(1);
      const found = args.find((a: unknown) => a === 'PA' || a === 'PZ');
      if (found) partIds.push(found as string);
    }
    expect(partIds).toEqual(['PA', 'PZ']);
  });
});
