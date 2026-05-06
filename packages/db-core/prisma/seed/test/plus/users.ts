// packages/db-core/prisma/seed/test/plus/users.ts
// @FUNCTION_CODE SYS-TEST-SVC-006-F01
// PLUS 測試租戶的 6 個測試使用者：採購 / 業務 / 倉管 / 財務 / 物流 / 人資。
// 同時為 admin 指派 ADMIN 角色。
// 必須在 applyTemplateToTenant 之後呼叫。

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

export async function seedPlusTestUsers(prisma: PrismaClient): Promise<void> {
  // === Step 1：指派 admin 的 ADMIN 角色 ===
  await assignRole(prisma, TEST_PLUS_TENANT_ID, TEST_PLUS_ADMIN_USER_ID, 'SYSADMIN');

  // === Step 2：建立 6 個測試使用者 + 指派角色 ===
  const users: TestUser[] = [
    { id: 'NX01USER9900021', userAccount: 'purchase1',  userName: '王小明（採購專員）', roleCode: 'PURCHASING'  },
    { id: 'NX01USER9900022', userAccount: 'sales1',     userName: '陳美玲（業務專員）', roleCode: 'SALES'     },
    { id: 'NX01USER9900023', userAccount: 'warehouse1', userName: '林大偉（倉管專員）', roleCode: 'WAREHOUSE' },
    { id: 'NX01USER9900024', userAccount: 'finance1',   userName: '黃志豪（財務專員）', roleCode: 'FINANCE'   },
    // NX01USER9900025 logistics1 已移除（TASK-PHASE2-NX01-USER-ROLE-SCHEMA-EXTEND-01、Crown 拍 Q1：外包物流由 partner_type=T 處理、不是內部 role）
    { id: 'NX01USER9900026', userAccount: 'hr1',        userName: '李淑芬（人資專員）', roleCode: 'HR'        },
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

    await assignRole(prisma, TEST_PLUS_TENANT_ID, u.id, u.roleCode);
  }

  console.log(`✅ [TEST/PLUS] users: ${users.length} 筆 + admin 角色指派`);
}
