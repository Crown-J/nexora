// apps/nx-api/src/shared/nx02/nx02-advisory-lock.ts
// B5 advisory lock 工具（B5-impl §3.5）
// - 鎖維度：(tenantId, rfqId) — 給「採用 QT」場景，避免兩個採購同時對同 RFQ 採用不同 QT
// - hashtextextended('${tenant}:rfq:${rfqId}', 0) 64-bit 唯一 key
//   ':rfq:' sentinel 區隔跟 D4 nx04-advisory-lock 的 (tenant:part:warehouse) namespace
// - SET LOCAL lock_timeout 防無限等
// - 第二個 transaction 會等第一個 commit/rollback；超時走 55P03 由 caller retry

import type { Prisma } from 'db-core';

const DEFAULT_TIMEOUT_SEC = parseEnvInt(process.env.NX02_LOCK_TIMEOUT_SEC, 5);

function parseEnvInt(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const Nx02AdvisoryLock = {
  /**
   * 在當前 transaction 內鎖定 (tenantId, rfqId)。
   * 兩個採購同時對同 RFQ 採用不同 QT → 第二個會等第一個 commit/rollback。
   * - 同 hash 邏輯（hashtextextended）跟 D4 advisory lock 一致
   * - SET LOCAL lock_timeout 5s（預設，可由 NX02_LOCK_TIMEOUT_SEC 覆寫）
   * - lock 在 transaction 結束自動釋放，不需手動 unlock
   *
   * 超時時 PostgreSQL 拋 55P03，由 caller 的 retry loop 處理。
   */
  async lockRfqId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    rfqId: string,
    options?: { timeoutSeconds?: number },
  ): Promise<void> {
    const timeoutSec = options?.timeoutSeconds ?? DEFAULT_TIMEOUT_SEC;
    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${timeoutSec}s'`);
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${tenantId} || ':rfq:' || ${rfqId}, 0)
      )
    `;
  },

  /** 給單元測試用：把 (tenantId, rfqId) 轉成跟 SQL 一樣的 hash key */
  keyToString(tenantId: string, rfqId: string): string {
    return `${tenantId}:rfq:${rfqId}`;
  },
};
