// apps/nx-api/src/shared/nx10/nx10-apply-medal-bonus-to-salary.ts
// NX07 SalaryRecord（DRAFT）→ 醫章 tier 加碼倍率薪資加給 helper
//
// 對齊：
//   - TASK-NX10-IMPL-02 plan v0.1.0 §L3 helper 3
//   - overview v1.0 §3.2 #4 不可預期 + #1 使命
//
// 業務語意：
//   - 員工醫章 tier → 加碼倍率：
//       BRONZE   ×1.00（無加碼）
//       SILVER   ×1.05
//       GOLD     ×1.10
//       PLATINUM ×1.15
//       DIAMOND  ×1.20
//   - 加碼基礎：本月 KPI-AUTO items 加總（applyKpiBonus 寫入後執行）
//   - 加碼金額 = sumKpiAuto × (multiplier - 1)
//   - 寫入：Nx07SalaryRecordItem（綁定 'MEDAL_BONUS' 或第一個 KPI component、calcBasis prefix `MEDAL-BONUS:`）
//   - 冪等：先 delete 既有 MEDAL-BONUS items 再重算
//   - 無醫章 / BRONZE tier / 無 component / 無 KPI 基礎 → graceful skip
//   - 失敗不阻擋上游 applyKpiBonus 流程（呼叫方 try/catch wrap）

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

const MEDAL_BONUS_CALC_BASIS_PREFIX = 'MEDAL-BONUS:';
const KPI_AUTO_CALC_BASIS_PREFIX = 'KPI-AUTO:';

const TIER_MULTIPLIER: Record<string, number> = {
  BRONZE: 1.0,
  SILVER: 1.05,
  GOLD: 1.1,
  PLATINUM: 1.15,
  DIAMOND: 1.2,
};

export async function applyMedalBonusToSalary(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; salaryRecordId: string; userId: string; actorUserId: string },
): Promise<{
  ok: boolean;
  bonus: string;
  tier: string;
  multiplier: number;
  skipped: boolean;
  reason?: string;
}> {
  const salary = await tx.nx07SalaryRecord.findFirst({
    where: { id: p.salaryRecordId, tenantId: p.tenantId },
    select: { id: true, userId: true, yearMonth: true, status: true },
  });
  if (!salary) return zero('salary not found');
  if (salary.status !== 'DRAFT') return zero(`status=${salary.status} not DRAFT`);

  // 1. read medal tier
  const medal = await tx.nx10EmpMedal.findUnique({
    where: { userId: salary.userId },
    include: { medalLevel: { select: { tier: true, levelName: true } } },
  });
  const tier = medal?.medalLevel?.tier ?? 'BRONZE';
  const multiplier = TIER_MULTIPLIER[tier] ?? 1.0;
  if (multiplier <= 1.0) return zeroWith(tier, multiplier, 'tier no bonus');

  // 2. sum existing KPI-AUTO items（加碼基礎）
  const kpiItems = await tx.nx07SalaryRecordItem.findMany({
    where: {
      salaryRecordId: salary.id,
      calcBasis: { startsWith: KPI_AUTO_CALC_BASIS_PREFIX },
    },
    select: { id: true, componentId: true, amount: true },
  });
  if (!kpiItems.length) return zeroWith(tier, multiplier, 'no KPI base');

  let kpiSum = new PrismaNs.Decimal(0);
  for (const it of kpiItems) kpiSum = kpiSum.add(new PrismaNs.Decimal(it.amount));
  if (kpiSum.lte(0)) return zeroWith(tier, multiplier, 'KPI base zero');

  // 3. 冪等：刪既有 MEDAL-BONUS items
  await tx.nx07SalaryRecordItem.deleteMany({
    where: {
      salaryRecordId: salary.id,
      calcBasis: { startsWith: MEDAL_BONUS_CALC_BASIS_PREFIX },
    },
  });

  // 4. 計算 bonus = kpiSum × (multiplier - 1)
  const bonusRate = new PrismaNs.Decimal(multiplier - 1);
  const bonus = kpiSum.mul(bonusRate).toDecimalPlaces(2);
  if (bonus.lte(0)) return zeroWith(tier, multiplier, 'bonus zero');

  // 5. lookup/fallback component（找 isSystem 加項 component、無則 fallback 第一個 KPI item 的 component）
  const sysComponent = await tx.nx07SalaryComponent.findFirst({
    where: {
      tenantId: p.tenantId,
      compType: 'A',
      isActive: true,
      isSystem: true,
    },
    select: { id: true, code: true },
  });
  const componentId = sysComponent?.id ?? kpiItems[0]!.componentId;

  // 6. write item
  const basis = `${MEDAL_BONUS_CALC_BASIS_PREFIX}tier=${tier} × ×${multiplier} − 1 = ${bonusRate.toString()} × KPI ${kpiSum.toString()} = ${bonus.toString()}`;
  await tx.nx07SalaryRecordItem.create({
    data: {
      salaryRecordId: salary.id,
      componentId,
      amount: bonus,
      calcBasis: basis.slice(0, 200),
    },
  });

  return {
    ok: true,
    bonus: bonus.toString(),
    tier,
    multiplier,
    skipped: false,
  };
}

function zero(reason: string) {
  return { ok: false, bonus: '0', tier: '', multiplier: 1, skipped: true, reason };
}

function zeroWith(tier: string, multiplier: number, reason: string) {
  return { ok: true, bonus: '0', tier, multiplier, skipped: true, reason };
}
