// packages/db-core/prisma/seed/index.ts
// @FUNCTION_CODE SYS-SEED-MAIN-001-F01
// Seed 主入口：透過 CLI 參數控制執行範圍。
//
// 兩層架構：
//   1. system 層（所有環境都跑）：SYSTEM 租戶 + SYSADMIN + 9 plans + view
//      / currency / country / warehouse_type
//   2. test 層（僅 NODE_ENV=development|test）：3 個測試租戶（LITE/PLUS/PRO）
//      含各自的 applyTemplateToTenant + 測試使用者
//
// CLI 使用：
//   pnpm prisma db seed                              → --mode all --tier all（預設）
//   pnpm prisma db seed -- --mode system             → 只跑 system（PROD 部署用）
//   pnpm prisma db seed -- --mode test --tier lite   → 只建 LITE 測試租戶
//   pnpm prisma db seed -- --mode all --tier pro     → system + PRO 測試租戶

import { disconnectPrisma, prisma } from './client';
import { runSystemSeed } from './system';
import { runTestSeed, type TestTier } from './test';

type SeedMode = 'system' | 'test' | 'all';

interface SeedArgs {
  mode: SeedMode;
  tier: TestTier;
}

function parseArgs(argv: readonly string[]): SeedArgs {
  const result: SeedArgs = { mode: 'all', tier: 'all' };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];

    if (flag === '--mode') {
      if (value === 'system' || value === 'test' || value === 'all') {
        result.mode = value;
        i++;
      } else {
        throw new Error(`Invalid --mode: ${String(value)}. Use 'system' | 'test' | 'all'.`);
      }
    } else if (flag === '--tier') {
      if (value === 'lite' || value === 'plus' || value === 'pro' || value === 'all') {
        result.tier = value;
        i++;
      } else {
        throw new Error(`Invalid --tier: ${String(value)}. Use 'lite' | 'plus' | 'pro' | 'all'.`);
      }
    }
  }
  return result;
}

async function main(): Promise<void> {
  const { mode, tier } = parseArgs(process.argv.slice(2));

  console.log('====================================');
  console.log('🌱 NEXORA Seed 主入口');
  console.log(`   mode = ${mode}`);
  console.log(`   tier = ${tier}`);
  console.log(`   NODE_ENV = ${process.env.NODE_ENV ?? 'development'}`);
  console.log('====================================');

  try {
    // system 層：mode=system 或 all 都會跑
    if (mode === 'system' || mode === 'all') {
      await runSystemSeed(prisma);
    }

    // test 層：mode=test 或 all 才跑；內部會再檢查 NODE_ENV
    if (mode === 'test' || mode === 'all') {
      await runTestSeed(prisma, tier);
    }

    console.log('====================================');
    console.log('✅ NEXORA Seed 全部完成');
    console.log('====================================');
  } finally {
    await disconnectPrisma();
  }
}

main().catch((e) => {
  console.error('❌ Seed 執行失敗：', e);
  process.exit(1);
});
