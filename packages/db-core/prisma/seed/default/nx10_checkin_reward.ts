import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

/**
 * 規格表 nx10_checkin_reward 尚未存在於 schema；以任務範本 nx10_task_template 承載「連續簽到第 N 日」獎勵 Exp。
 */
export async function seedNx10CheckinReward(prisma: PrismaClient, tier: SeedTier): Promise<void> {
  if (tier !== 'PRO') {
    console.log('⏭ default/nx10_checkin_reward: skipped (非 PRO)');
    return;
  }

  const rewards = [
    { code: 'STREAK_D1', name: '連續簽到第1日', exp: 5 },
    { code: 'STREAK_D2', name: '連續簽到第2日', exp: 8 },
    { code: 'STREAK_D3', name: '連續簽到第3日', exp: 12 },
    { code: 'STREAK_D4', name: '連續簽到第4日', exp: 16 },
    { code: 'STREAK_D5', name: '連續簽到第5日', exp: 22 },
    { code: 'STREAK_D6', name: '連續簽到第6日', exp: 28 },
    { code: 'STREAK_D7', name: '連續簽到第7日', exp: 40 },
  ];

  for (const r of rewards) {
    await prisma.nx10TaskTemplate.upsert({
      where: { code: r.code },
      create: {
        tenantId: DEMO_TENANT_ID,
        code: r.code,
        name: r.name,
        taskCycle: 'O',
        expBase: r.exp,
        expFormula: `連續簽到里程碑：+${r.exp} Exp`,
        sourceModule: null,
        isSystem: true,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: r.name,
        expBase: r.exp,
        expFormula: `連續簽到里程碑：+${r.exp} Exp`,
        isSystem: true,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx10_task_template_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx10_task_template), 0), 1), true)`,
  );

  console.log(`✅ default/nx10_checkin_reward (task_template): ${rewards.length} 筆`);
}
