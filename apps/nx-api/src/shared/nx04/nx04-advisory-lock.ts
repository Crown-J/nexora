// apps/nx-api/src/shared/nx04/nx04-advisory-lock.ts
// D4 翻譯器 advisory lock 工具（D4-impl §3.5）
// - hashtextextended('${tenant}:${part}:${warehouse}', 0) 64-bit 唯一 key
// - SET LOCAL lock_timeout 防無限等
// - keys 排序避免 deadlock（D4 意圖 §3.3）

import type { Prisma } from 'db-core';

export interface LockKey {
  tenantId: string;
  partId: string;
  warehouseId: string;
}

const DEFAULT_TIMEOUT_SEC = parseEnvInt(process.env.TRANSLATOR_LOCK_TIMEOUT_SEC, 5);

function parseEnvInt(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const Nx04AdvisoryLock = {
  /**
   * 在當前 transaction 內為一組 (tenant, part, warehouse) 三元組依序取 advisory lock。
   * - 自動排序避 deadlock（D4 意圖 §3.3）
   * - 設定 SET LOCAL lock_timeout（預設 5s，可由 TRANSLATOR_LOCK_TIMEOUT_SEC 覆寫）
   * - lock 在 transaction 結束自動釋放，不需手動 unlock
   *
   * 超時時 PostgreSQL 拋 55P03，由 caller 的 retry loop 處理。
   */
  async acquireXactLocks(
    tx: Prisma.TransactionClient,
    keys: LockKey[],
    options?: { timeoutSeconds?: number },
  ): Promise<void> {
    const timeoutSec = options?.timeoutSeconds ?? DEFAULT_TIMEOUT_SEC;
    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${timeoutSec}s'`);

    const sorted = [...keys].sort((a, b) =>
      Nx04AdvisoryLock.keyToString(a).localeCompare(Nx04AdvisoryLock.keyToString(b)),
    );
    // De-dup（同 key 取 lock 兩次 PostgreSQL 容許但無意義）
    const seen = new Set<string>();
    for (const k of sorted) {
      const s = Nx04AdvisoryLock.keyToString(k);
      if (seen.has(s)) continue;
      seen.add(s);
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${k.tenantId} || ':' || ${k.partId} || ':' || ${k.warehouseId}, 0)
        )
      `;
    }
  },

  keyToString(k: LockKey): string {
    return `${k.tenantId}:${k.partId}:${k.warehouseId}`;
  },

  /**
   * 把同 key 重複的 lineItem 收斂成 unique LockKey 清單（給 acquireXactLocks 用）。
   * 排序為 stable，便於單元測試斷言。
   */
  collectUniqueKeys(tenantId: string, items: Array<{ partId: string; warehouseId: string }>): LockKey[] {
    const seen = new Set<string>();
    const out: LockKey[] = [];
    for (const it of items) {
      const k: LockKey = { tenantId, partId: it.partId, warehouseId: it.warehouseId };
      const s = Nx04AdvisoryLock.keyToString(k);
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(k);
    }
    return out.sort((a, b) =>
      Nx04AdvisoryLock.keyToString(a).localeCompare(Nx04AdvisoryLock.keyToString(b)),
    );
  },
};
