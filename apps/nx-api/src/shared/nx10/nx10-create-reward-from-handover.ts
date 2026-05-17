// apps/nx-api/src/shared/nx10/nx10-create-reward-from-handover.ts
// NX06 DnHandover COMPLETED → NX10 fromDriver + toDriver 各 25 Exp 動態交接協作獎勵 helper
// 業界改革 ⭐⭐⭐（中小汽配 ERP 業界第一個 跨車交接協作 → 遊戲化獎勵 wire）
//
// 對齊：
//   - TASK-NX10-IMPL-02 plan v0.1.0 §L3 helper 1
//   - overview v1.0 §3.2 #5 社交影響
//   - 範式：仿 nx05-create-paylog-from-salary（pure tx helper + 冪等 prefix）
//
// 業務語意：
//   - DnHandover status 進入 COMPLETED → 雙方外務員各獲 25 Exp（協作獎勵）
//   - 冪等：reason prefix `HANDOVER:<handoverId>` 標記去重
//   - 失敗不阻擋上游 handover.updateStatus 流程（呼叫方 try/catch wrap）

import type { Prisma } from 'db-core';

import type { Nx10ExpService } from '../../nx10/exp/nx10-exp.service';

const HANDOVER_REASON_PREFIX = 'HANDOVER:';
const REWARD_PER_DRIVER = 25;

export async function createRewardFromHandover(
  tx: Prisma.TransactionClient,
  expService: Nx10ExpService,
  p: { tenantId: string; handoverId: string; actorUserId: string },
): Promise<{ ok: boolean; awarded: number; skipped: boolean; reason?: string }> {
  const handover = await tx.nx06DnHandover.findFirst({
    where: { id: p.handoverId, tenantId: p.tenantId },
    select: {
      id: true,
      fromDriverId: true,
      toDriverId: true,
      status: true,
      dn: { select: { docNo: true } },
    },
  });
  if (!handover) return { ok: false, awarded: 0, skipped: true, reason: 'handover not found' };
  if (handover.status !== 'COMPLETED') {
    return { ok: false, awarded: 0, skipped: true, reason: `status=${handover.status} not COMPLETED` };
  }

  // 冪等：reason prefix 去重
  const dupPrefix = `${HANDOVER_REASON_PREFIX}${handover.id}`;
  const dup = await tx.nx10EmpExpLog.findFirst({
    where: { tenantId: p.tenantId, reason: { startsWith: dupPrefix } },
    select: { id: true },
  });
  if (dup) return { ok: true, awarded: 0, skipped: true, reason: 'already awarded' };

  const dnDocNo = handover.dn?.docNo ?? handover.id;
  const reason = `${dupPrefix}|動態交接協作獎勵 (DN ${dnDocNo})`;

  for (const driverId of [handover.fromDriverId, handover.toDriverId]) {
    await expService.applyExpChange(tx, {
      tenantId: p.tenantId,
      userId: driverId,
      amount: REWARD_PER_DRIVER,
      sourceType: 'MS',
      reason,
      sourceRefId: handover.id,
      actorUserId: p.actorUserId,
    });
  }

  return { ok: true, awarded: REWARD_PER_DRIVER * 2, skipped: false };
}
