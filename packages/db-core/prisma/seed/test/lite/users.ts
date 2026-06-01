// packages/db-core/prisma/seed/test/lite/users.ts
// @FUNCTION_CODE SYS-TEST-SVC-003-F02
// LITE 測試租戶測試使用者
//
// v1.2 對齊軌 FU-07：對齊 v1.2 §12.2「從零建角色」
//   admin 不指派任何角色（過去版本曾掛 SYSADMIN「假裝伊諾瓦」、
//   現已移到 INNOVA 營運租戶下的 innova-admin、見 seed/system/nx99_innova_tenant.ts）
//   4 個測試員工也不指派任何角色（負責人手動到「設定→角色與權限」建後指派）

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

export async function seedLiteTestUsers(prisma: PrismaClient): Promise<void> {
  // === Step 1：撤回 admin 過去可能被指派的 SYSADMIN 角色 ===
  //     （舊 seed 版本曾把 SYSADMIN 借掛在測試租戶 admin 上、現營運主體已遷 INNOVA、
  //      此處刪除確保重跑 seed 後乾淨。SYSADMIN 角色本身仍由 applyRole 建在租戶下、
  //      只是無人持有、不影響功能。）
  const liteSysadminRole = await prisma.nx01Role.findFirst({
    where: { tenantId: TEST_LITE_TENANT_ID, code: 'SYSADMIN' },
    select: { id: true },
  });
  if (liteSysadminRole) {
    await prisma.nx01UserRole.deleteMany({
      where: {
        tenantId: TEST_LITE_TENANT_ID,
        userId: TEST_LITE_ADMIN_USER_ID,
        roleId: liteSysadminRole.id,
      },
    });
  }

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

  console.log(`✅ [TEST/LITE] users: ${users.length} 筆 + admin（皆未綁角色、v1.2 範式；SYSADMIN 改由 INNOVA 持有）`);
}
