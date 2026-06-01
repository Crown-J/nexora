// packages/db-core/prisma/seed/test/plus/users.ts
// @FUNCTION_CODE SYS-TEST-SVC-006-F02
// PLUS 測試租戶測試使用者
//
// v1.2 對齊軌 FU-07：對齊 v1.2 §12.2「從零建角色」
//   admin 不指派任何角色（SYSADMIN 已遷 INNOVA、見 seed/system/nx99_innova_tenant.ts）
//   5 個測試員工也不指派任何角色（負責人手動到「設定→角色與權限」建後指派）

import type { PrismaClient } from '../../../../generated/prisma';
import { SYSADMIN_USER_ID } from '../../system/constants';
import {
  TEST_ADMIN_PASSWORD_HASH,
  TEST_PLUS_ADMIN_USER_ID,
  TEST_PLUS_TENANT_ID,
} from '../constants';

interface TestUser {
  id: string;
  userAccount: string;
  userName: string;
}

export async function seedPlusTestUsers(prisma: PrismaClient): Promise<void> {
  // === Step 1：撤回 admin 過去可能被指派的 SYSADMIN 角色（同 LITE 處理）===
  const plusSysadminRole = await prisma.nx01Role.findFirst({
    where: { tenantId: TEST_PLUS_TENANT_ID, code: 'SYSADMIN' },
    select: { id: true },
  });
  if (plusSysadminRole) {
    await prisma.nx01UserRole.deleteMany({
      where: {
        tenantId: TEST_PLUS_TENANT_ID,
        userId: TEST_PLUS_ADMIN_USER_ID,
        roleId: plusSysadminRole.id,
      },
    });
  }

  const users: TestUser[] = [
    { id: 'NX01USER9900021', userAccount: 'employee1', userName: '王小明（測試員工）' },
    { id: 'NX01USER9900022', userAccount: 'employee2', userName: '陳美玲（測試員工）' },
    { id: 'NX01USER9900023', userAccount: 'employee3', userName: '林大偉（測試員工）' },
    { id: 'NX01USER9900024', userAccount: 'employee4', userName: '黃志豪（測試員工）' },
    { id: 'NX01USER9900026', userAccount: 'employee5', userName: '李淑芬（測試員工）' },
  ];

  for (const u of users) {
    await prisma.nx01User.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        tenantId: TEST_PLUS_TENANT_ID,
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

  console.log(`✅ [TEST/PLUS] users: ${users.length} 筆 + admin（皆未綁角色、v1.2 範式；SYSADMIN 改由 INNOVA 持有）`);
}
