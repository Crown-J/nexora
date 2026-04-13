import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx01CarBrand(prisma: PrismaClient, _tier: SeedTier): Promise<void> {
  const twn = await prisma.nx01Country.findUnique({ where: { code: 'TWN' } });
  const rows = [
    { code: 'VW', name: 'Volkswagen', countryId: twn?.id ?? null, sortNo: 1 },
    { code: 'AUDI', name: 'Audi', countryId: twn?.id ?? null, sortNo: 2 },
    { code: 'SKODA', name: 'Škoda', countryId: twn?.id ?? null, sortNo: 3 },
    { code: 'SEAT', name: 'SEAT', countryId: twn?.id ?? null, sortNo: 4 },
    { code: 'PORSCHE', name: 'Porsche', countryId: twn?.id ?? null, sortNo: 5 },
  ];

  for (const r of rows) {
    await prisma.nx01CarBrand.upsert({
      where: { code: r.code },
      create: {
        tenantId: DEMO_TENANT_ID,
        code: r.code,
        name: r.name,
        countryId: r.countryId,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: r.name,
        countryId: r.countryId,
        sortNo: r.sortNo,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_car_brand_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_car_brand), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_car_brand: ${rows.length} 筆`);
}
