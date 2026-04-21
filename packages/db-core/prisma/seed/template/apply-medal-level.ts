// packages/db-core/prisma/seed/template/apply-medal-level.ts
// @FUNCTION_CODE SYS-TMPL-SVC-011-F01
// 範本：勳章等級（PRO，16 階 = 4 tier × 4 rank）。非 PRO skip。
// upsert by tenantId_levelCode（migration 20260421132744_fix_tenant_scoped_unique 後）
// 注意：composite key 是 levelCode 不是 code。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

interface MedalDef {
  levelCode: string;
  levelName: string;
  tier: string;
  rank: number;
  sortNo: number;
  exp: number;
}

/** 銅 IV → 白金 I，共 16 階；level_code ≤ 10 字元。 */
const MEDAL_DEF: MedalDef[] = [
  { levelCode: 'BRONZE_IV',  levelName: '銅牌IV',   tier: 'BRONZE',   rank: 4, sortNo: 1,  exp: 0 },
  { levelCode: 'BRONZE_III', levelName: '銅牌III',  tier: 'BRONZE',   rank: 3, sortNo: 2,  exp: 200 },
  { levelCode: 'BRONZE_II',  levelName: '銅牌II',   tier: 'BRONZE',   rank: 2, sortNo: 3,  exp: 500 },
  { levelCode: 'BRONZE_I',   levelName: '銅牌I',    tier: 'BRONZE',   rank: 1, sortNo: 4,  exp: 1000 },
  { levelCode: 'SILVER_IV',  levelName: '銀牌IV',   tier: 'SILVER',   rank: 4, sortNo: 5,  exp: 1800 },
  { levelCode: 'SILVER_III', levelName: '銀牌III',  tier: 'SILVER',   rank: 3, sortNo: 6,  exp: 2800 },
  { levelCode: 'SILVER_II',  levelName: '銀牌II',   tier: 'SILVER',   rank: 2, sortNo: 7,  exp: 4000 },
  { levelCode: 'SILVER_I',   levelName: '銀牌I',    tier: 'SILVER',   rank: 1, sortNo: 8,  exp: 5500 },
  { levelCode: 'GOLD_IV',    levelName: '金牌IV',   tier: 'GOLD',     rank: 4, sortNo: 9,  exp: 7500 },
  { levelCode: 'GOLD_III',   levelName: '金牌III',  tier: 'GOLD',     rank: 3, sortNo: 10, exp: 10000 },
  { levelCode: 'GOLD_II',    levelName: '金牌II',   tier: 'GOLD',     rank: 2, sortNo: 11, exp: 13000 },
  { levelCode: 'GOLD_I',     levelName: '金牌I',    tier: 'GOLD',     rank: 1, sortNo: 12, exp: 17000 },
  { levelCode: 'PLAT_IV',    levelName: '白金IV',   tier: 'PLATINUM', rank: 4, sortNo: 13, exp: 22000 },
  { levelCode: 'PLAT_III',   levelName: '白金III',  tier: 'PLATINUM', rank: 3, sortNo: 14, exp: 28000 },
  { levelCode: 'PLAT_II',    levelName: '白金II',   tier: 'PLATINUM', rank: 2, sortNo: 15, exp: 35000 },
  { levelCode: 'PLAT_I',     levelName: '白金I',    tier: 'PLATINUM', rank: 1, sortNo: 16, exp: 45000 },
];

export async function applyMedalLevel(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, tier, actorUserId } = params;

  if (tier !== 'PRO') {
    console.log('⏭ [TEMPLATE] applyMedalLevel: skipped (非 PRO)');
    return;
  }

  for (const m of MEDAL_DEF) {
    await prisma.nx10MedalLevel.upsert({
      where: { tenantId_levelCode: { tenantId, levelCode: m.levelCode } },
      create: {
        tenantId,
        levelCode: m.levelCode,
        levelName: m.levelName,
        tier: m.tier,
        rank: m.rank,
        sortNo: m.sortNo,
        expThreshold: m.exp,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        levelName: m.levelName,
        tier: m.tier,
        rank: m.rank,
        sortNo: m.sortNo,
        expThreshold: m.exp,
        isActive: true,
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx10_medal_level_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx10_medal_level), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyMedalLevel: ${MEDAL_DEF.length} 筆 (tenant=${tenantId})`);
}
