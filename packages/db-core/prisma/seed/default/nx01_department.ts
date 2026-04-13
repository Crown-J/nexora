import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx01Department(prisma: PrismaClient, tier: SeedTier): Promise<void> {
  if (tier === 'LITE') {
    console.log('⏭ default/nx01_department: skipped (LITE)');
    return;
  }

  const rows = [
    { code: 'PURCHASE', name: '採購部', sortNo: 1 },
    { code: 'SALES', name: '業務部', sortNo: 2 },
    { code: 'WAREHOUSE', name: '倉儲部', sortNo: 3 },
    { code: 'FINANCE', name: '財務部', sortNo: 4 },
    { code: 'LOGISTICS', name: '物流部', sortNo: 5 },
    { code: 'HR', name: '人資部', sortNo: 6 },
  ];

  for (const r of rows) {
    const existing = await prisma.nx01Department.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: r.code },
    });
    if (existing) {
      await prisma.nx01Department.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          sortNo: r.sortNo,
          isActive: true,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    } else {
      await prisma.nx01Department.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          code: r.code,
          name: r.name,
          sortNo: r.sortNo,
          isActive: true,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_department_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_department), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_department: ${rows.length} 筆`);
}
