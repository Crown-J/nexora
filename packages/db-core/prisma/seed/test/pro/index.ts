// packages/db-core/prisma/seed/test/pro/index.ts
// @FUNCTION_CODE SYS-TEST-SVC-010-F01
// PRO 測試租戶統合 seed：租戶 → 套用 template → 測試使用者。

import type { PrismaClient } from '../../../../generated/prisma';
import { applyTemplateToTenant } from '../../template';
import { TEST_PRO_ADMIN_USER_ID, TEST_PRO_TENANT_ID } from '../constants';
import { seedProTenant } from './tenant';
import { seedProTestUsers } from './users';

export async function seedProTestTenant(prisma: PrismaClient): Promise<void> {
  console.log('▶ [TEST/PRO] 開始建立 PRO 測試租戶...');

  await seedProTenant(prisma);

  await applyTemplateToTenant(prisma, {
    tenantId: TEST_PRO_TENANT_ID,
    tier: 'PRO',
    actorUserId: TEST_PRO_ADMIN_USER_ID,
  });

  await seedProTestUsers(prisma);

  console.log('✅ [TEST/PRO] PRO 測試租戶建立完成');
}
