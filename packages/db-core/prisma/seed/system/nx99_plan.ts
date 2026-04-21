// packages/db-core/prisma/seed/system/nx99_plan.ts
// @FUNCTION_CODE SYS-SEED-SVC-002-F01
// 系統層：9 級距訂閱方案（LITE-S/M, PLUS-S/M/L, PRO-S/M/L/XL）。
// 來源：docs/spec/version_plan.csv

import type { PrismaClient } from '../../../generated/prisma';
import { SYSADMIN_USER_ID } from './constants';

interface PlanRow {
  code: string;
  name: string;
  levelNo: number;
  baseFeeMonth: number;
  seatFeeMonth: number;
  minSeats: number;
  maxSeats: number;
  tier: string;
  sortNo: number;
}

export async function seedNx99Plan(prisma: PrismaClient): Promise<void> {
  const plans: PlanRow[] = [
    { code: 'NEXORA-LITE-S',  name: 'NEXORA LITE S',  levelNo: 11, baseFeeMonth:  2500, seatFeeMonth: 400, minSeats:  1, maxSeats:   5, tier: 'S',  sortNo: 1 },
    { code: 'NEXORA-LITE-M',  name: 'NEXORA LITE M',  levelNo: 12, baseFeeMonth:  4500, seatFeeMonth: 400, minSeats:  6, maxSeats:  10, tier: 'M',  sortNo: 2 },
    { code: 'NEXORA-PLUS-S',  name: 'NEXORA PLUS S',  levelNo: 21, baseFeeMonth:  8000, seatFeeMonth: 600, minSeats:  5, maxSeats:  10, tier: 'S',  sortNo: 3 },
    { code: 'NEXORA-PLUS-M',  name: 'NEXORA PLUS M',  levelNo: 22, baseFeeMonth: 13000, seatFeeMonth: 600, minSeats: 11, maxSeats:  20, tier: 'M',  sortNo: 4 },
    { code: 'NEXORA-PLUS-L',  name: 'NEXORA PLUS L',  levelNo: 23, baseFeeMonth: 18000, seatFeeMonth: 600, minSeats: 21, maxSeats:  30, tier: 'L',  sortNo: 5 },
    { code: 'NEXORA-PRO-S',   name: 'NEXORA PRO S',   levelNo: 31, baseFeeMonth: 25000, seatFeeMonth: 800, minSeats: 10, maxSeats:  20, tier: 'S',  sortNo: 6 },
    { code: 'NEXORA-PRO-M',   name: 'NEXORA PRO M',   levelNo: 32, baseFeeMonth: 38000, seatFeeMonth: 800, minSeats: 21, maxSeats:  40, tier: 'M',  sortNo: 7 },
    { code: 'NEXORA-PRO-L',   name: 'NEXORA PRO L',   levelNo: 33, baseFeeMonth: 55000, seatFeeMonth: 800, minSeats: 41, maxSeats:  70, tier: 'L',  sortNo: 8 },
    { code: 'NEXORA-PRO-XL',  name: 'NEXORA PRO XL',  levelNo: 34, baseFeeMonth: 70000, seatFeeMonth: 800, minSeats: 71, maxSeats: 100, tier: 'XL', sortNo: 9 },
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

  console.log(`✅ [SYSTEM] nx99_plan: ${plans.length} 筆方案`);
}
