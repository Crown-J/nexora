import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID, TENANT_ADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

function planCodeForTier(tier: SeedTier): string {
  if (tier === 'LITE') return 'NEXORA-LITE';
  if (tier === 'PLUS') return 'NEXORA-PLUS';
  return 'NEXORA-PRO';
}

export async function seedNx99Tenant(prisma: PrismaClient): Promise<{ tenantId: string }> {
  await prisma.nx99Tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    create: {
      id: DEMO_TENANT_ID,
      code: 'HENGYIN',
      name: '恆迎企業',
      nameEn: 'Heng Yin Enterprise',
      status: 'A',
      remark: 'Phase 4 測試租戶（seed）',
      sortNo: 1,
      isActive: true,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      name: '恆迎企業',
      nameEn: 'Heng Yin Enterprise',
      status: 'A',
      isActive: true,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx99_tenant_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx99_tenant), 0), 1), true)`,
  );

  console.log(`✅ default/nx99_tenant: ${DEMO_TENANT_ID}`);

  return { tenantId: DEMO_TENANT_ID };
}

export async function seedNx99Subscription(prisma: PrismaClient, tier: SeedTier): Promise<void> {
  const plan = await prisma.nx99Plan.findUniqueOrThrow({ where: { code: planCodeForTier(tier) } });
  const twd = await prisma.nx01Currency.findUniqueOrThrow({ where: { code: 'TWD' } });
  const now = new Date();

  const wantSeats = tier === 'LITE' ? 5 : tier === 'PLUS' ? 15 : 30;
  const seats = Math.min(wantSeats, plan.maxSeats);

  await prisma.nx99Subscription.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });

  await prisma.nx99Subscription.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      planId: plan.id,
      status: 'A',
      billingCycle: 'M',
      seats,
      startAt: now.toISOString().slice(0, 10),
      endAt: '2099-12-31',
      autoRenew: true,
      baseFeeSnapshot: plan.baseFeeMonth,
      seatFeeSnapshot: plan.seatFeeMonth,
      discountTypeSnapshot: 'N',
      discountValueSnapshot: 0,
      subtotalSnapshot: plan.baseFeeMonth,
      discountAmountSnapshot: 0,
      totalSnapshot: plan.baseFeeMonth,
      currencyId: twd.id,
      createdBy: TENANT_ADMIN_USER_ID,
      updatedBy: TENANT_ADMIN_USER_ID,
    },
  });

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx99_subscription_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx99_subscription), 0), 1), true)`,
  );

  console.log(`✅ default/nx99_subscription: plan=${plan.code} seats=${seats}`);
}
