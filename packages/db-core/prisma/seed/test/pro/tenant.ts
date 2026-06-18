// packages/db-core/prisma/seed/test/pro/tenant.ts
// @FUNCTION_CODE SYS-TEST-SVC-008-F01
// 建立 PRO 測試租戶（TEST-PRO）+ 訂閱（NEXORA-PRO-XL, 100 seats）+ admin 使用者。

import type { PrismaClient } from '../../../../generated/prisma';
import { SYSADMIN_USER_ID } from '../../system/constants';
import {
  TEST_ADMIN_PASSWORD_HASH,
  TEST_PRO_ADMIN_OWNER_UR_ID,
  TEST_PRO_ADMIN_USER_ID,
  TEST_PRO_TENANT_ID,
} from '../constants';

export async function seedProTenant(prisma: PrismaClient): Promise<void> {
  // 1. 建立租戶
  await prisma.nx99Tenant.upsert({
    where: { id: TEST_PRO_TENANT_ID },
    create: {
      id: TEST_PRO_TENANT_ID,
      code: 'TEST-PRO',
      name: '測試公司（PRO）',
      nameEn: 'Test Company PRO',
      status: 'A',
      remark: 'DEV 測試租戶 - PRO 版本（NEXORA-PRO-XL 方案）',
      sortNo: 9903,
      isActive: true,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      code: 'TEST-PRO',
      name: '測試公司（PRO）',
      nameEn: 'Test Company PRO',
      status: 'A',
      isActive: true,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 2. 建立訂閱（NEXORA-PRO-XL，100 seats）
  const plan = await prisma.nx99Plan.findUniqueOrThrow({
    where: { code: 'NEXORA-PRO-XL' },
  });
  const twd = await prisma.nx01Currency.findUniqueOrThrow({
    where: { code: 'TWD' },
  });

  await prisma.nx99Subscription.deleteMany({
    where: { tenantId: TEST_PRO_TENANT_ID },
  });

  await prisma.nx99Subscription.create({
    data: {
      tenantId: TEST_PRO_TENANT_ID,
      planId: plan.id,
      status: 'A',
      billingCycle: 'M',
      seats: 100,
      startAt: new Date().toISOString().slice(0, 10),
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
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 3. 建立 admin 使用者（isTenantOwner=true、租戶負責人旗標）
  await prisma.nx01User.upsert({
    where: { id: TEST_PRO_ADMIN_USER_ID },
    create: {
      id: TEST_PRO_ADMIN_USER_ID,
      tenantId: TEST_PRO_TENANT_ID,
      userAccount: 'admin',
      passwordHash: TEST_ADMIN_PASSWORD_HASH,
      userName: '測試租戶管理員（PRO）',
      isActive: true,
      isTenantOwner: true,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      tenantId: TEST_PRO_TENANT_ID,
      userAccount: 'admin',
      passwordHash: TEST_ADMIN_PASSWORD_HASH,
      userName: '測試租戶管理員（PRO）',
      isActive: true,
      isTenantOwner: true,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 4. 掛 OWNER 角色（2026-06-18 修：admin 沒掛 OWNER role 會被 RolesGuard 擋 403）
  const ownerRole = await prisma.nx01Role.findFirst({
    where: { tenantId: TEST_PRO_TENANT_ID, code: 'OWNER' },
  });
  if (ownerRole) {
    await prisma.nx01UserRole.upsert({
      where: { id: TEST_PRO_ADMIN_OWNER_UR_ID },
      create: {
        id: TEST_PRO_ADMIN_OWNER_UR_ID,
        tenantId: TEST_PRO_TENANT_ID,
        userId: TEST_PRO_ADMIN_USER_ID,
        roleId: ownerRole.id,
        isPrimary: true,
        isActive: true,
        assignedAt: new Date(),
        assignedBy: SYSADMIN_USER_ID,
      },
      update: {
        roleId: ownerRole.id,
        isPrimary: true,
        isActive: true,
        revokedAt: null,
      },
    });
  }

  console.log(`✅ [TEST/PRO] tenant=${TEST_PRO_TENANT_ID} admin=${TEST_PRO_ADMIN_USER_ID} (OWNER)`);
}
