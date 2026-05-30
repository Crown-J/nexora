// packages/db-core/prisma/seed/test/lite/users.ts
// @FUNCTION_CODE SYS-TEST-SVC-003-F02
// LITE 測試租戶測試使用者
//
// v1.2 對齊軌 FU-07：對齊 v1.2 §12.2「從零建角色」
//   admin 指派 SYSADMIN（伊諾瓦跨租戶管理）
//   4 個測試員工不指派任何角色（負責人需手動到「設定→角色與權限」建角色後指派）

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
  // === Step 1：指派 admin 的 SYSADMIN 角色 ===
  await assignRole(prisma, TEST_LITE_TENANT_ID, TEST_LITE_ADMIN_USER_ID, 'SYSADMIN');

  // === Step 2：建立 4 個測試使用者（不指派角色、v1.2 §12.2 從零建）===
  const users: TestUser[] = [
    { id: 'NX01USER9900011', userAccount: 'employee1', userName: '王小明（測試員工）' },
    { id: 'NX01USER9900012', userAccount: 'employee2', userName: '陳美玲（測試員工）' },
    { id: 'NX01USER9900013', userAccount: 'employee3', userName: '林大偉（測試員工）' },
    { id: 'NX01USER9900014', userAccount: 'employee4', userName: '黃志豪（測試員工）' },
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
    // v1.2：不自動指派任何角色、負責人手動到「設定→角色與權限」建角色後指派
  }

  console.log(`✅ [TEST/LITE] users: ${users.length} 筆（未綁角色、v1.2 範式）+ admin SYSADMIN 指派`);
}
