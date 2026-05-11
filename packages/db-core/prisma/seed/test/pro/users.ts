// packages/db-core/prisma/seed/test/pro/users.ts
// @FUNCTION_CODE SYS-TEST-SVC-009-F01
// PRO 測試租戶的 8 個測試使用者。
// 同時為 admin 指派 SYSADMIN 角色。
// 必須在 applyTemplateToTenant 之後呼叫。
//
// 說明：
//   - PLUS 6 人基礎 + 業務組長 + 行政專員 = 8 人
//   - 業務組長 roleCode 採 SALES（組長/組員層級由其他欄位表示，本 role 體系無 SALES_LEAD）
//   - 行政專員 roleCode 採 HR（本 role 體系無獨立「行政」role）
//   - 若需精細角色，待後續 role 擴充後再對應

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

export async function seedProTestUsers(prisma: PrismaClient): Promise<void> {
  // === Step 1：指派 admin 的 ADMIN 角色 ===
  await assignRole(prisma, TEST_PRO_TENANT_ID, TEST_PRO_ADMIN_USER_ID, 'SYSADMIN');

  // === Step 2：建立 8 個測試使用者 + 指派角色 ===
  const users: TestUser[] = [
    { id: 'NX01USER9900031', userAccount: 'purchase1',   userName: '王小明（採購專員）', roleCode: 'PURCHASING'  },
    { id: 'NX01USER9900032', userAccount: 'sales1',      userName: '陳美玲（業務專員）', roleCode: 'SALES'     },
    { id: 'NX01USER9900033', userAccount: 'warehouse1',  userName: '林大偉（倉管專員）', roleCode: 'WAREHOUSE' },
    { id: 'NX01USER9900034', userAccount: 'finance1',    userName: '黃志豪（財務專員）', roleCode: 'FINANCE'   },
    // NX01USER9900035 logistics1 已移除（TASK-PHASE2-NX01-USER-ROLE-SCHEMA-EXTEND-01、Crown 拍 Q1：外包物流由 partner_type=T 處理）
    // NX01USER9900036 hr_admin role 改 HR（HR_ADMIN role 已移除、進階權限 by application 層判斷）
    { id: 'NX01USER9900036', userAccount: 'hr_admin',    userName: '李淑芬（人資主管）', roleCode: 'HR'        },
    { id: 'NX01USER9900037', userAccount: 'sales_lead',  userName: '周建華（業務組長）', roleCode: 'SALES'     },
    { id: 'NX01USER9900038', userAccount: 'admin_clerk', userName: '劉雅婷（行政專員）', roleCode: 'HR'        },
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

    await assignRole(prisma, TEST_PRO_TENANT_ID, u.id, u.roleCode);
  }

  console.log(`✅ [TEST/PRO] users: ${users.length} 筆 + admin 角色指派`);
}
