// apps/nx-api/src/shared/nx10/nx10-update-ranking-from-performance.ts
// NX04 SO SHIPPED → NX10 業務員業績排行榜 Exp helper（業績 tier-based 獎勵）
//
// 對齊：
//   - TASK-NX10-IMPL-02 plan v0.1.0 §L3 helper 2
//   - overview v1.0 §3.2 #2 達標 + #4 不可預期
//
// 業務語意：
//   - SO 進入 SHIPPED → 業務員（createdBy）依 totalAmount tier 獎勵 Exp：
//       >100,000 → +50 Exp（PREMIUM）
//       >10,000  → +20 Exp（STANDARD）
//       其他    → +5 Exp（BASE）
//   - 冪等：reason prefix `SO_SHIPPED:<docNo>` 標記去重
//   - 失敗不阻擋上游 so.update 流程（呼叫方 try/catch wrap）

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { Nx10ExpService } from '../../nx10/exp/nx10-exp.service';

const SO_REASON_PREFIX = 'SO_SHIPPED:';

export async function updateRankingFromPerformance(
  tx: Prisma.TransactionClient,
  expService: Nx10ExpService,
  p: { tenantId: string; soId: string; actorUserId: string },
): Promise<{ ok: boolean; awarded: number; tier: string; skipped: boolean; reason?: string }> {
  const so = await tx.nx04So.findFirst({
    where: { id: p.soId, tenantId: p.tenantId },
    select: { id: true, docNo: true, totalAmount: true, status: true, createdBy: true },
  });
  if (!so) return { ok: false, awarded: 0, tier: '', skipped: true, reason: 'SO not found' };
  if (so.status !== 'SHIPPED') {
    return { ok: false, awarded: 0, tier: '', skipped: true, reason: `status=${so.status} not SHIPPED` };
  }
  if (!so.createdBy) {
    return { ok: false, awarded: 0, tier: '', skipped: true, reason: 'SO missing createdBy' };
  }

  // 冪等
  const dupPrefix = `${SO_REASON_PREFIX}${so.docNo}`;
  const dup = await tx.nx10EmpExpLog.findFirst({
    where: { tenantId: p.tenantId, reason: { startsWith: dupPrefix } },
    select: { id: true },
  });
  if (dup) return { ok: true, awarded: 0, tier: '', skipped: true, reason: 'already awarded' };

  const total = new PrismaNs.Decimal(String(so.totalAmount));
  let amount = 5;
  let tier = 'BASE';
  if (total.gt(100000)) {
    amount = 50;
    tier = 'PREMIUM';
  } else if (total.gt(10000)) {
    amount = 20;
    tier = 'STANDARD';
  }

  const reason = `${dupPrefix}|業績 ${total.toString()} = ${tier} +${amount} Exp`;
  await expService.applyExpChange(tx, {
    tenantId: p.tenantId,
    userId: so.createdBy,
    amount,
    sourceType: 'MS',
    reason,
    sourceRefId: so.id,
    actorUserId: p.actorUserId,
  });

  return { ok: true, awarded: amount, tier, skipped: false };
}
