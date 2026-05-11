// packages/db-core/prisma/seed/test/lite/index.ts
// @FUNCTION_CODE SYS-TEST-SVC-004-F01
// LITE 測試租戶統合 seed：租戶 → 套用 template → 測試使用者。
//
// 依賴順序（不可變動）：
//   1. seedLiteTenant         建 tenant + admin + 訂閱
//   2. applyTemplateToTenant  建 role/warehouse/department 等主檔
//   3. seedLiteTestUsers      建其他使用者 + 指派角色（需 role 已存在）

import type { PrismaClient } from '../../../../generated/prisma';
import { applyTemplateToTenant } from '../../template';
import { TEST_LITE_ADMIN_USER_ID, TEST_LITE_TENANT_ID } from '../constants';
import { seedLiteTenant } from './tenant';
import { seedLiteTestUsers } from './users';

export async function seedLiteTestTenant(prisma: PrismaClient): Promise<void> {
  console.log('▶ [TEST/LITE] 開始建立 LITE 測試租戶...');

  // 1. 建租戶本體 + admin user + 訂閱
  await seedLiteTenant(prisma);

  // 2. 套用 template（建 role / warehouse / 等主檔）
  await applyTemplateToTenant(prisma, {
    tenantId: TEST_LITE_TENANT_ID,
    tier: 'LITE',
    actorUserId: TEST_LITE_ADMIN_USER_ID,
  });

  // 3. 建測試使用者 + 指派角色（含 admin 的 SYSADMIN 角色指派）
  await seedLiteTestUsers(prisma);

  console.log('✅ [TEST/LITE] LITE 測試租戶建立完成');
}
