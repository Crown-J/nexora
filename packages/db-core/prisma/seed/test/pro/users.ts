// packages/db-core/prisma/seed/test/pro/users.ts
// @FUNCTION_CODE SYS-TEST-SVC-009-F02
// PRO 測試租戶測試使用者
//
// v1.2 對齊軌 FU-07：對齊 v1.2 §12.2「從零建角色」
//   admin 指派 SYSADMIN
//   7 個測試員工不指派任何角色（負責人手動到「設定→角色與權限」建後指派）

import type { PrismaClient } from '../../../../generated/prisma';
import { SYSADMIN_USER_ID } from '../../system/constants';
import {
  TEST_ADMIN_PASSWORD_HASH,
  TEST_PRO_ADMIN_USER_ID,
  TEST_PRO_TENANT_ID,
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

export async function seedProTestUsers(prisma: PrismaClient): Promise<void> {
  await assignRole(prisma, TEST_PRO_TENANT_ID, TEST_PRO_ADMIN_USER_ID, 'SYSADMIN');

  const users: TestUser[] = [
    { id: 'NX01USER9900031', userAccount: 'employee1', userName: '王小明（測試員工）' },
    { id: 'NX01USER9900032', userAccount: 'employee2', userName: '陳美玲（測試員工）' },
    { id: 'NX01USER9900033', userAccount: 'employee3', userName: '林大偉（測試員工）' },
    { id: 'NX01USER9900034', userAccount: 'employee4', userName: '黃志豪（測試員工）' },
    { id: 'NX01USER9900036', userAccount: 'employee5', userName: '李淑芬（測試員工）' },
    { id: 'NX01USER9900037', userAccount: 'employee6', userName: '周建華（測試員工）' },
    { id: 'NX01USER9900038', userAccount: 'employee7', userName: '劉雅婷（測試員工）' },
  ];

  for (const u of users) {
    await prisma.nx01User.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        tenantId: TEST_PRO_TENANT_ID,
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
  }

  console.log(`✅ [TEST/PRO] users: ${users.length} 筆（未綁角色、v1.2 範式）+ admin SYSADMIN 指派`);
}
