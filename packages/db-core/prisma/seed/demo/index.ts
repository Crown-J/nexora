// packages/db-core/prisma/seed/demo/index.ts
// @FUNCTION_CODE SYS-DEMO-MAIN-001-F01
// DEMO-02 業務 mock 資料 seed 主入口（依 tier 分批跑）
//
// CLI 使用：
//   pnpm prisma db seed -- --mode demo --tier lite   → 只跑 LITE
//   pnpm prisma db seed -- --mode demo --tier plus   → 只跑 PLUS
//   pnpm prisma db seed -- --mode demo --tier pro    → 只跑 PRO
//   pnpm prisma db seed -- --mode demo --tier all    → 三個都跑（不建議、Crown 拍板分批跑）

import type { PrismaClient } from '../../../generated/prisma';

import type { TestTier } from '../test';
import { seedLiteDemo } from './lite';

export async function runDemoSeed(prisma: PrismaClient, tier: TestTier): Promise<void> {
  console.log('====================================');
  console.log('🎬 DEMO-02 業務資料 seed');
  console.log(`   tier = ${tier}`);
  console.log('====================================');

  if (tier === 'lite' || tier === 'all') {
    await seedLiteDemo(prisma);
  }

  if (tier === 'plus' || tier === 'all') {
    console.log('▶ [DEMO-02/PLUS] 待 Crown review LITE 後實作（Stage F）');
  }

  if (tier === 'pro' || tier === 'all') {
    console.log('▶ [DEMO-02/PRO] 待 Crown review PLUS 後實作（Stage G）');
  }

  console.log('✅ DEMO-02 seed 完成（依 tier）');
}
