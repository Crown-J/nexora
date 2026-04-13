import type { PrismaClient } from '../../../generated/prisma';
import { SYSADMIN_USER_ID } from './constants';

export async function seedNx99Plan(prisma: PrismaClient): Promise<void> {
  const plans = [
    {
      code: 'NEXORA-LITE',
      name: 'NEXORA LITE',
      levelNo: 10,
      baseFeeMonth: 2500,
      seatFeeMonth: 400,
      minSeats: 1,
      maxSeats: 10,
      tier: 'S',
      sortNo: 1,
    },
    {
      code: 'NEXORA-PLUS',
      name: 'NEXORA PLUS',
      levelNo: 20,
      baseFeeMonth: 8000,
      seatFeeMonth: 600,
      minSeats: 5,
      maxSeats: 30,
      tier: 'M',
      sortNo: 2,
    },
    {
      code: 'NEXORA-PRO',
      name: 'NEXORA PRO',
      levelNo: 30,
      baseFeeMonth: 25000,
      seatFeeMonth: 800,
      minSeats: 10,
      maxSeats: 100,
      tier: 'L',
      sortNo: 3,
    },
  ];

  for (const p of plans) {
    await prisma.nx99Plan.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        name: p.name,
        levelNo: p.levelNo,
        baseFeeMonth: p.baseFeeMonth,
        seatFeeMonth: p.seatFeeMonth,
        minSeats: p.minSeats,
        maxSeats: p.maxSeats,
        tier: p.tier,
        sortNo: p.sortNo,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: p.name,
        levelNo: p.levelNo,
        baseFeeMonth: p.baseFeeMonth,
        seatFeeMonth: p.seatFeeMonth,
        minSeats: p.minSeats,
        maxSeats: p.maxSeats,
        tier: p.tier,
        sortNo: p.sortNo,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx99_plan_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx99_plan), 0), 1), true)`,
  );

  console.log(`✅ default/nx99_plan: ${plans.length} 筆`);
}
