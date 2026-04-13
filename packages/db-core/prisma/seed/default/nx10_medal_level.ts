import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

/** 銅 IV → 白金 I，共 16 階；level_code ≤ 10 字元。 */
const MEDAL_DEF: { levelCode: string; levelName: string; tier: string; rank: number; sortNo: number; exp: number }[] =
  [
    { levelCode: 'BRONZE_IV', levelName: '銅牌IV', tier: 'BRONZE', rank: 4, sortNo: 1, exp: 0 },
    { levelCode: 'BRONZE_III', levelName: '銅牌III', tier: 'BRONZE', rank: 3, sortNo: 2, exp: 200 },
    { levelCode: 'BRONZE_II', levelName: '銅牌II', tier: 'BRONZE', rank: 2, sortNo: 3, exp: 500 },
    { levelCode: 'BRONZE_I', levelName: '銅牌I', tier: 'BRONZE', rank: 1, sortNo: 4, exp: 1000 },
    { levelCode: 'SILVER_IV', levelName: '銀牌IV', tier: 'SILVER', rank: 4, sortNo: 5, exp: 1800 },
    { levelCode: 'SILVER_III', levelName: '銀牌III', tier: 'SILVER', rank: 3, sortNo: 6, exp: 2800 },
    { levelCode: 'SILVER_II', levelName: '銀牌II', tier: 'SILVER', rank: 2, sortNo: 7, exp: 4000 },
    { levelCode: 'SILVER_I', levelName: '銀牌I', tier: 'SILVER', rank: 1, sortNo: 8, exp: 5500 },
    { levelCode: 'GOLD_IV', levelName: '金牌IV', tier: 'GOLD', rank: 4, sortNo: 9, exp: 7500 },
    { levelCode: 'GOLD_III', levelName: '金牌III', tier: 'GOLD', rank: 3, sortNo: 10, exp: 10000 },
    { levelCode: 'GOLD_II', levelName: '金牌II', tier: 'GOLD', rank: 2, sortNo: 11, exp: 13000 },
    { levelCode: 'GOLD_I', levelName: '金牌I', tier: 'GOLD', rank: 1, sortNo: 12, exp: 17000 },
    { levelCode: 'PLAT_IV', levelName: '白金IV', tier: 'PLATINUM', rank: 4, sortNo: 13, exp: 22000 },
    { levelCode: 'PLAT_III', levelName: '白金III', tier: 'PLATINUM', rank: 3, sortNo: 14, exp: 28000 },
    { levelCode: 'PLAT_II', levelName: '白金II', tier: 'PLATINUM', rank: 2, sortNo: 15, exp: 35000 },
    { levelCode: 'PLAT_I', levelName: '白金I', tier: 'PLATINUM', rank: 1, sortNo: 16, exp: 45000 },
  ];

export async function seedNx10MedalLevel(prisma: PrismaClient, tier: SeedTier): Promise<void> {
  if (tier !== 'PRO') {
    console.log('⏭ default/nx10_medal_level: skipped (非 PRO)');
    return;
  }

  for (const m of MEDAL_DEF) {
    await prisma.nx10MedalLevel.upsert({
      where: { levelCode: m.levelCode },
      create: {
        tenantId: DEMO_TENANT_ID,
        levelCode: m.levelCode,
        levelName: m.levelName,
        tier: m.tier,
        rank: m.rank,
        sortNo: m.sortNo,
        expThreshold: m.exp,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        levelName: m.levelName,
        tier: m.tier,
        rank: m.rank,
        sortNo: m.sortNo,
        expThreshold: m.exp,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx10_medal_level_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx10_medal_level), 0), 1), true)`,
  );

  console.log(`✅ default/nx10_medal_level: ${MEDAL_DEF.length} 筆`);
}
