// packages/db-core/prisma/seed/test/plus/tenant.ts
// @FUNCTION_CODE SYS-TEST-SVC-005-F01
// 建立 PLUS 測試租戶（TEST-PLUS）+ 訂閱（NEXORA-PLUS-L, 30 seats）+ admin 使用者。

import type { PrismaClient } from '../../../../generated/prisma';
import { SYSADMIN_USER_ID } from '../../system/constants';
import {
  TEST_ADMIN_PASSWORD_HASH,
  TEST_PLUS_ADMIN_USER_ID,
  TEST_PLUS_TENANT_ID,
} from '../constants';

export async function seedPlusTenant(prisma: PrismaClient): Promise<void> {
  // 1. 建立租戶
  await prisma.nx99Tenant.upsert({
    where: { id: TEST_PLUS_TENANT_ID },
    create: {
      id: TEST_PLUS_TENANT_ID,
      code: 'TEST-PLUS',
      name: '測試公司（PLUS）',
      nameEn: 'Test Company PLUS',
      status: 'A',
      remark: 'DEV 測試租戶 - PLUS 版本（NEXORA-PLUS-L 方案）',
      sortNo: 9902,
      isActive: true,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      code: 'TEST-PLUS',
      name: '測試公司（PLUS）',
      nameEn: 'Test Company PLUS',
      status: 'A',
      isActive: true,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 2. 建立訂閱（NEXORA-PLUS-L，30 seats）
  const plan = await prisma.nx99Plan.findUniqueOrThrow({
    where: { code: 'NEXORA-PLUS-L' },
  });
  const twd = await prisma.nx01Currency.findUniqueOrThrow({
    where: { code: 'TWD' },
  });

  await prisma.nx99Subscription.deleteMany({
    where: { tenantId: TEST_PLUS_TENANT_ID },
  });

  await prisma.nx99Subscription.create({
    data: {
      tenantId: TEST_PLUS_TENANT_ID,
      planId: plan.id,
      status: 'A',
      billingCycle: 'M',
      seats: 30,
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

  // 3. 建立 admin 使用者
  await prisma.nx01User.upsert({
    where: { id: TEST_PLUS_ADMIN_USER_ID },
    create: {
      id: TEST_PLUS_ADMIN_USER_ID,
      tenantId: TEST_PLUS_TENANT_ID,
      userAccount: 'admin',
      passwordHash: TEST_ADMIN_PASSWORD_HASH,
      userName: '測試租戶管理員（PLUS）',
      isActive: true,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      tenantId: TEST_PLUS_TENANT_ID,
      userAccount: 'admin',
      passwordHash: TEST_ADMIN_PASSWORD_HASH,
      userName: '測試租戶管理員（PLUS）',
      isActive: true,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  console.log(`✅ [TEST/PLUS] tenant=${TEST_PLUS_TENANT_ID} admin=${TEST_PLUS_ADMIN_USER_ID}`);
}
