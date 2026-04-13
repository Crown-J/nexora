import { Prisma } from '../../../generated/prisma';
import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx01CustomerGrade(prisma: PrismaClient, _tier: SeedTier): Promise<void> {
  const rows = [
    { code: 'A', name: 'A 級客戶', marginPct: new Prisma.Decimal('12.0'), sortNo: 1 },
    { code: 'B', name: 'B 級客戶', marginPct: new Prisma.Decimal('15.0'), sortNo: 2 },
    { code: 'C', name: 'C 級客戶', marginPct: new Prisma.Decimal('18.0'), sortNo: 3 },
    { code: 'D', name: 'D 級客戶', marginPct: new Prisma.Decimal('22.0'), sortNo: 4 },
  ];

  for (const r of rows) {
    const existing = await prisma.nx01CustomerGrade.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: r.code },
    });
    if (existing) {
      await prisma.nx01CustomerGrade.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          marginPct: r.marginPct,
          sortNo: r.sortNo,
          isActive: true,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    } else {
      await prisma.nx01CustomerGrade.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          code: r.code,
          name: r.name,
          marginPct: r.marginPct,
          sortNo: r.sortNo,
          isActive: true,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_customer_grade_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_customer_grade), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_customer_grade: ${rows.length} 筆`);
}
