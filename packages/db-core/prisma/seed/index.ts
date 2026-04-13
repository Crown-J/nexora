import { disconnectPrisma, prisma } from './client';
import { defaultSeedTierFromEnv, runDefaultSeed, runSystemSeed } from './default/index';
import type { SeedTier } from './lib/seed-tier';
import { seedTestLite } from './test/lite/index';
import { seedTestPlus } from './test/plus/index';
import { seedTestPro } from './test/pro/index';

async function main(): Promise<void> {
  const mode = (process.argv[2] ?? 'default').toLowerCase();
  const testVariant = (process.argv[3] ?? 'lite').toLowerCase();

  console.log(`\n🌱 NEXORA db-core seed — mode=${mode}${mode === 'test' ? ` variant=${testVariant}` : ''}\n`);

  try {
    if (mode === 'system') {
      await runSystemSeed(prisma);
    } else if (mode === 'default') {
      const tier = defaultSeedTierFromEnv('PRO');
      await runDefaultSeed(prisma, tier);
    } else if (mode === 'test') {
      const tier: SeedTier =
        testVariant === 'plus' ? 'PLUS' : testVariant === 'pro' ? 'PRO' : 'LITE';
      process.env.SEED_TIER = tier;
      await runDefaultSeed(prisma, tier);
      if (testVariant === 'plus') await seedTestPlus(prisma);
      else if (testVariant === 'pro') await seedTestPro(prisma);
      else await seedTestLite(prisma);
    } else {
      console.error(`Unknown mode: ${mode}. Use: system | default | test [lite|plus|pro]`);
      process.exitCode = 1;
      return;
    }

    console.log('\n🌱 Seed 完成。\n');
  } finally {
    await disconnectPrisma();
  }
}

void main();
