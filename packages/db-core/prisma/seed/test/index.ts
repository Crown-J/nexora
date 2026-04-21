// packages/db-core/prisma/seed/test/index.ts
// @FUNCTION_CODE SYS-TEST-SVC-000-F01
// 測試 seed 入口：僅在 NODE_ENV=development 或 test 時執行。
// 支援 tier 過濾（all/lite/plus/pro），對應 seed 主入口的 --tier CLI 參數。

import type { PrismaClient } from '../../../generated/prisma';
import { seedLiteTestTenant } from './lite';
import { seedPlusTestTenant } from './plus';
import { seedProTestTenant } from './pro';

export type TestTier = 'lite' | 'plus' | 'pro' | 'all';

export async function runTestSeed(
  prisma: PrismaClient,
  tier: TestTier = 'all',
): Promise<void> {
  const env = process.env.NODE_ENV ?? 'development';
  const allowedEnvs = ['development', 'test'];

  if (!allowedEnvs.includes(env)) {
    console.log(`⏭ [TEST] 跳過 test seed（NODE_ENV=${env}，非 development/test）`);
    return;
  }

  console.log(`▶ [TEST] 開始建立測試租戶（tier=${tier}）...`);

  if (tier === 'all' || tier === 'lite') {
    await seedLiteTestTenant(prisma);
  }
  if (tier === 'all' || tier === 'plus') {
    await seedPlusTestTenant(prisma);
  }
  if (tier === 'all' || tier === 'pro') {
    await seedProTestTenant(prisma);
  }

  console.log('✅ [TEST] 測試租戶建立完成');
}
