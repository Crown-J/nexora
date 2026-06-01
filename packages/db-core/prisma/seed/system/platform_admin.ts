// packages/db-core/prisma/seed/system/platform_admin.ts
// @FUNCTION_CODE SYS-SEED-SVC-007-F01
// 平台層 vs 租戶層分離軌 Phase 1：建立首位伊諾瓦營運超管。
//
// 設計重點：
// - 跟 nx99_innova_tenant.ts（過渡期保留）並存、Phase 6 才退役 INNOVA 租戶。
// - account 跨平台唯一（不分租戶、平台層只有一個 namespace）。
// - mustChangePassword=true：首次登入強制改密。
// - created_by / updated_by 首筆自參考（VARCHAR scalar、無 FK 約束、合法）。
//
// ID 段位：
// - PLATADMN0000001 = 首位營運超管（innova-admin）

import type { PrismaClient } from '../../../generated/prisma';
import { DEFAULT_PASSWORD_HASH } from './constants';

/** 首位伊諾瓦營運超管 ID */
export const INNOVA_PLATFORM_ADMIN_ID = 'PLATADMN0000001';
/** 平台登入帳號 */
export const INNOVA_PLATFORM_ADMIN_ACCOUNT = 'innova-admin';

export async function seedPlatformAdmin(prisma: PrismaClient): Promise<void> {
  await prisma.platformAdmin.upsert({
    where: { id: INNOVA_PLATFORM_ADMIN_ID },
    create: {
      id: INNOVA_PLATFORM_ADMIN_ID,
      account: INNOVA_PLATFORM_ADMIN_ACCOUNT,
      passwordHash: DEFAULT_PASSWORD_HASH,
      displayName: '伊諾瓦營運管理員',
      email: 'admin@innova.local',
      isActive: true,
      mustChangePassword: true,
      remark: 'Phase 1 seed: 伊諾瓦自家正式營運超管、跨租戶開戶用。Phase 6 退役舊 INNOVA 租戶後成為唯一平台入口。',
      createdBy: INNOVA_PLATFORM_ADMIN_ID,
      updatedBy: INNOVA_PLATFORM_ADMIN_ID,
    },
    update: {
      // 重跑 seed 不覆寫 passwordHash 與 mustChangePassword，
      // 讓 innova-admin 改完密碼後重跑 seed 不會被重置。
      account: INNOVA_PLATFORM_ADMIN_ACCOUNT,
      displayName: '伊諾瓦營運管理員',
      email: 'admin@innova.local',
      isActive: true,
      updatedBy: INNOVA_PLATFORM_ADMIN_ID,
    },
  });

  // 同步 sequence、確保下個 platform_admin id 從 MAX+1 起跳
  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_platform_admin_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM platform_admin), 0), 1), true)`,
  );

  console.log(`✅ [SYSTEM] platform_admin: 首位營運超管建立完成`);
  console.log(`   - adminId=${INNOVA_PLATFORM_ADMIN_ID} account=${INNOVA_PLATFORM_ADMIN_ACCOUNT}`);
}
