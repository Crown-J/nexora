import { Prisma } from '../../../generated/prisma';
import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx07LeaveType(prisma: PrismaClient, tier: SeedTier): Promise<void> {
  if (tier !== 'PRO') {
    console.log('⏭ default/nx07_leave_type: skipped (非 PRO)');
    return;
  }

  const rows = [
    {
      code: 'ANNUAL',
      name: '特休',
      isPaid: true,
      maxDaysPerYear: new Prisma.Decimal('10.0'),
      minApplyHours: new Prisma.Decimal('8.0'),
      sortNo: 1,
    },
    {
      code: 'SICK',
      name: '病假',
      isPaid: true,
      maxDaysPerYear: new Prisma.Decimal('30.0'),
      minApplyHours: new Prisma.Decimal('8.0'),
      sortNo: 2,
    },
    {
      code: 'PERSONAL',
      name: '事假',
      isPaid: false,
      maxDaysPerYear: null,
      minApplyHours: new Prisma.Decimal('8.0'),
      sortNo: 3,
    },
    {
      code: 'MENSTR',
      name: '生理假',
      isPaid: false,
      maxDaysPerYear: new Prisma.Decimal('12.0'),
      minApplyHours: new Prisma.Decimal('8.0'),
      sortNo: 4,
    },
    {
      code: 'MARRY',
      name: '婚假',
      isPaid: true,
      maxDaysPerYear: new Prisma.Decimal('8.0'),
      minApplyHours: new Prisma.Decimal('8.0'),
      sortNo: 5,
    },
    {
      code: 'FUNERAL',
      name: '喪假',
      isPaid: true,
      maxDaysPerYear: null,
      minApplyHours: new Prisma.Decimal('8.0'),
      sortNo: 6,
    },
  ];

  for (const r of rows) {
    const existing = await prisma.nx07LeaveType.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: r.code },
    });
    if (existing) {
      await prisma.nx07LeaveType.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          isPaid: r.isPaid,
          maxDaysPerYear: r.maxDaysPerYear,
          minApplyHours: r.minApplyHours,
          needApproval: true,
          isSystem: true,
          isActive: true,
          sortNo: r.sortNo,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    } else {
      await prisma.nx07LeaveType.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          code: r.code,
          name: r.name,
          isPaid: r.isPaid,
          maxDaysPerYear: r.maxDaysPerYear,
          minApplyHours: r.minApplyHours,
          needApproval: true,
          isSystem: true,
          isActive: true,
          sortNo: r.sortNo,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx07_leave_type_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx07_leave_type), 0), 1), true)`,
  );

  console.log(`✅ default/nx07_leave_type: ${rows.length} 筆`);
}
