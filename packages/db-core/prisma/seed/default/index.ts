import type { PrismaClient } from '../../../generated/prisma';
import { parseSeedTier, type SeedTier } from '../lib/seed-tier';
import { seedNx01RoleView } from '../system/nx01_role_view';
import { seedNx01View } from '../system/nx01_view';
import { DEMO_TENANT_ID, TENANT_ADMIN_USER_ID } from './constants';
import { seedNx01Bulletin } from './nx01_bulletin';
import { seedNx01CarBrand } from './nx01_car_brand';
import { seedNx01Country } from './nx01_country';
import { seedNx01Currency } from './nx01_currency';
import { seedNx01CustomerGrade } from './nx01_customer_grade';
import { seedNx01Department } from './nx01_department';
import { seedNx01DiscountCode } from './nx01_discount_code';
import { seedNx01PartBrand } from './nx01_part_brand';
import { seedNx01PartGroup } from './nx01_part_group';
import { seedNx01Role } from './nx01_role';
import { seedNx01User } from './nx01_user';
import { seedNx01UserRole } from './nx01_user_role';
import { seedNx01Warehouse } from './nx01_warehouse';
import { seedNx01WarehouseType } from './nx01_warehouse_type';
import { seedNx05AccountCode } from './nx05_account_code';
import { seedNx07LeaveType } from './nx07_leave_type';
import { seedNx10CheckinReward } from './nx10_checkin_reward';
import { seedNx10MedalLevel } from './nx10_medal_level';
import { seedNx99Plan } from './nx99_plan';
import { seedNx99Subscription, seedNx99Tenant } from './nx99_tenant';

export async function runSystemSeed(prisma: PrismaClient): Promise<void> {
  await seedNx01View(prisma);
}

export async function runDefaultSeed(prisma: PrismaClient, tier: SeedTier): Promise<void> {
  await seedNx01View(prisma);

  await seedNx99Plan(prisma);
  await seedNx01Currency(prisma);
  await seedNx01Country(prisma);
  await seedNx99Tenant(prisma);

  await seedNx01User(prisma);
  await seedNx01Role(prisma);
  await seedNx01UserRole(prisma);

  await seedNx99Subscription(prisma, tier);

  await seedNx01CarBrand(prisma, tier);
  await seedNx01PartGroup(prisma, tier);
  await seedNx01PartBrand(prisma, tier);
  await seedNx01CustomerGrade(prisma, tier);
  await seedNx01DiscountCode(prisma, tier);
  await seedNx01WarehouseType(prisma, tier);
  await seedNx01Warehouse(prisma, tier);
  await seedNx01Department(prisma, tier);
  await seedNx05AccountCode(prisma, tier);
  await seedNx07LeaveType(prisma, tier);
  await seedNx10MedalLevel(prisma, tier);
  await seedNx10CheckinReward(prisma, tier);
  await seedNx01Bulletin(prisma, tier);

  await seedNx01RoleView(prisma, {
    tenantId: DEMO_TENANT_ID,
    actorUserId: TENANT_ADMIN_USER_ID,
    tier,
  });
}

export function defaultSeedTierFromEnv(fallback: SeedTier): SeedTier {
  return parseSeedTier(process.env.SEED_TIER, fallback);
}
