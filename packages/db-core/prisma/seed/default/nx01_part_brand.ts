import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx01PartBrand(prisma: PrismaClient, _tier: SeedTier): Promise<void> {
  const deu = await prisma.nx01Country.findUnique({ where: { code: 'DEU' } });
  const rows = [
    { code: 'VAG', name: 'Volkswagen Group OE', countryId: deu?.id ?? null, sortNo: 1 },
    { code: 'BOS', name: 'Bosch', countryId: deu?.id ?? null, sortNo: 2 },
    { code: 'HEL', name: 'Hella', countryId: deu?.id ?? null, sortNo: 3 },
    { code: 'MAN', name: 'Mann-Filter', countryId: deu?.id ?? null, sortNo: 4 },
    { code: 'MAH', name: 'Mahle', countryId: deu?.id ?? null, sortNo: 5 },
    { code: 'LEM', name: 'Lemförder', countryId: deu?.id ?? null, sortNo: 6 },
    { code: 'SAC', name: 'Sachs (ZF)', countryId: deu?.id ?? null, sortNo: 7 },
    { code: 'ATE', name: 'ATE Brakes', countryId: deu?.id ?? null, sortNo: 8 },
    { code: 'NGK', name: 'NGK', countryId: deu?.id ?? null, sortNo: 9 },
    { code: 'GEN', name: '通用副廠', countryId: null, sortNo: 99 },
  ];

  for (const r of rows) {
    await prisma.nx01PartBrand.upsert({
      where: { tenantId_code: { tenantId: DEMO_TENANT_ID, code: r.code } },
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
    `SELECT setval('seq_nx01_part_brand_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_part_brand), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_part_brand: ${rows.length} 筆`);
}
