import type { PrismaClient } from '../../../generated/prisma';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx01WarehouseType(prisma: PrismaClient, tier: SeedTier): Promise<void> {
  if (tier === 'LITE') {
    console.log('⏭ default/nx01_warehouse_type: skipped (LITE)');
    return;
  }

  const rows = [
    { code: 'H', name: '總部集中倉', flowMode: 'C', sortNo: 1, description: 'HW1 類型' },
    { code: 'M', name: '主倉', flowMode: 'C', sortNo: 2, description: 'MW1 類型' },
    { code: 'W', name: '分倉', flowMode: 'D', sortNo: 3, description: 'BW 類型' },
    { code: 'S', name: '衛星倉', flowMode: 'D', sortNo: 4, description: '衛星據點' },
  ];

  for (const r of rows) {
    await prisma.nx01WarehouseType.upsert({
      where: { code: r.code },
      create: {
        code: r.code,
        name: r.name,
        flowMode: r.flowMode,
        sortNo: r.sortNo,
        description: r.description,
        isActive: true,
      },
      update: {
        name: r.name,
        flowMode: r.flowMode,
        sortNo: r.sortNo,
        description: r.description,
        isActive: true,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_warehouse_type_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_warehouse_type), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_warehouse_type: ${rows.length} 筆`);
}
