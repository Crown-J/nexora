import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx01PartGroup(prisma: PrismaClient, _tier: SeedTier): Promise<void> {
  const rows = [
    { code: 'ENGINE', name: '引擎系統', sortNo: 1 },
    { code: 'BRAKE', name: '煞車系統', sortNo: 2 },
    { code: 'FILTER', name: '濾清／油水', sortNo: 3 },
    { code: 'ELECTRIC', name: '電系', sortNo: 4 },
    { code: 'BODY', name: '車身／底盤', sortNo: 5 },
    { code: 'OTHER', name: '其他', sortNo: 99 },
  ];

  for (const r of rows) {
    await prisma.nx01PartGroup.upsert({
      where: { code: r.code },
      create: {
        tenantId: DEMO_TENANT_ID,
        code: r.code,
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_part_group_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_part_group), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_part_group: ${rows.length} 筆`);
}
