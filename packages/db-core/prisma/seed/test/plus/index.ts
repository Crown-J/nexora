// packages/db-core/prisma/seed/test/plus/index.ts
// @FUNCTION_CODE SYS-TEST-SVC-007-F01
// PLUS 測試租戶統合 seed：租戶 → 套用 template → 測試使用者。

import type { PrismaClient } from '../../../../generated/prisma';
import { applyTemplateToTenant } from '../../template';
import { TEST_PLUS_ADMIN_USER_ID, TEST_PLUS_TENANT_ID } from '../constants';
import { seedPlusTenant } from './tenant';
import { seedPlusTestUsers } from './users';

export async function seedPlusTestTenant(prisma: PrismaClient): Promise<void> {
  console.log('▶ [TEST/PLUS] 開始建立 PLUS 測試租戶...');

  await seedPlusTenant(prisma);

  await applyTemplateToTenant(prisma, {
    tenantId: TEST_PLUS_TENANT_ID,
    tier: 'PLUS',
    actorUserId: TEST_PLUS_ADMIN_USER_ID,
  });

  await seedPlusTestUsers(prisma);

  console.log('✅ [TEST/PLUS] PLUS 測試租戶建立完成');
}
