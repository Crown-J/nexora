import { Prisma } from '../../../generated/prisma';
import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx01DiscountCode(prisma: PrismaClient, _tier: SeedTier): Promise<void> {
  const rows = [
    {
      code: 'DEFECT',
      name: '瑕疵品折扣',
      discountType: 'P',
      discountValue: new Prisma.Decimal('15.0'),
      managedBy: 'P',
    },
    {
      code: 'USED',
      name: '中古件折扣',
      discountType: 'P',
      discountValue: new Prisma.Decimal('20.0'),
      managedBy: 'P',
    },
    {
      code: 'VIP',
      name: 'VIP 客戶折扣',
      discountType: 'P',
      discountValue: new Prisma.Decimal('5.0'),
      managedBy: 'S',
    },
    {
      code: 'BULK',
      name: '大量採購折扣',
      discountType: 'P',
      discountValue: new Prisma.Decimal('8.0'),
      managedBy: 'S',
    },
  ];

  for (const r of rows) {
    const existing = await prisma.nx01DiscountCode.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: r.code },
    });
    if (existing) {
      await prisma.nx01DiscountCode.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          discountType: r.discountType,
          discountValue: r.discountValue,
          managedBy: r.managedBy,
          isActive: true,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    } else {
      await prisma.nx01DiscountCode.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          code: r.code,
          name: r.name,
          discountType: r.discountType,
          discountValue: r.discountValue,
          managedBy: r.managedBy,
          isActive: true,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_discount_code_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_discount_code), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_discount_code: ${rows.length} 筆`);
}
