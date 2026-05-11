// packages/db-core/prisma/seed/test/lite/users.ts
// @FUNCTION_CODE SYS-TEST-SVC-003-F01
// LITE 測試租戶的 4 個測試使用者：採購 / 業務 / 倉管 / 財務。
// 同時在最前面為 admin 指派 SYSADMIN 角色。
// 注意：此函式必須在 applyTemplateToTenant 之後呼叫（需要 role 資料）。

import type { PrismaClient } from '../../../../generated/prisma';
import { SYSADMIN_USER_ID } from '../../system/constants';
import {
  TEST_ADMIN_PASSWORD_HASH,
  TEST_LITE_ADMIN_USER_ID,
  TEST_LITE_TENANT_ID,
} from '../constants';

interface TestUser {
  id: string;
  userAccount: string;
  userName: string;
  roleCode: string;
}

async function assignRole(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  roleCode: string,
): Promise<void> {
  const role = await prisma.nx01Role.findFirstOrThrow({
    where: { tenantId, code: roleCode },
  });
  const existing = await prisma.nx01UserRole.findFirst({
    where: { tenantId, userId, roleId: role.id },
  });
  if (!existing) {
    await prisma.nx01UserRole.create({
      data: {
        tenantId,
        userId,
        roleId: role.id,
        isPrimary: true,
        assignedBy: SYSADMIN_USER_ID,
      },
    });
  }
}

export async function seedLiteTestUsers(prisma: PrismaClient): Promise<void> {
  // === Step 1：指派 admin 的 ADMIN 角色 ===
  await assignRole(prisma, TEST_LITE_TENANT_ID, TEST_LITE_ADMIN_USER_ID, 'SYSADMIN');

  // === Step 2：建立 4 個測試使用者 + 指派角色 ===
  const users: TestUser[] = [
    { id: 'NX01USER9900011', userAccount: 'purchase1',  userName: '王小明（採購專員）', roleCode: 'PURCHASING'  },
    { id: 'NX01USER9900012', userAccount: 'sales1',     userName: '陳美玲（業務專員）', roleCode: 'SALES'     },
    { id: 'NX01USER9900013', userAccount: 'warehouse1', userName: '林大偉（倉管專員）', roleCode: 'WAREHOUSE' },
    { id: 'NX01USER9900014', userAccount: 'finance1',   userName: '黃志豪（財務專員）', roleCode: 'FINANCE'   },
  ];

  for (const u of users) {
    await prisma.nx01User.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        tenantId: TEST_LITE_TENANT_ID,
        userAccount: u.userAccount,
        passwordHash: TEST_ADMIN_PASSWORD_HASH,
        userName: u.userName,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        userName: u.userName,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });

    await assignRole(prisma, TEST_LITE_TENANT_ID, u.id, u.roleCode);
  }

  console.log(`✅ [TEST/LITE] users: ${users.length} 筆 + admin 角色指派`);
}
