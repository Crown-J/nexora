// packages/db-core/prisma/seed/template/index.ts
// @FUNCTION_CODE SYS-TMPL-SVC-001-F01
// 租戶範本套用入口：被 test seed 與未來的 SYS-W01 初始化 API 共用。
//
// 使用方式：
//   await applyTemplateToTenant(prisma, {
//     tenantId: 'NX99TANT9900001',
//     tier: 'LITE',
//     actorUserId: 'NX01USER9900001',
//   });

import type { PrismaClient } from '../../../generated/prisma';
import type { SeedTier } from '../lib/seed-tier';
import { seedNx01RoleView } from '../system/nx01_role_view';

import { applyAccountCode } from './apply-account-code';
import { applyBrandCodeRule } from './apply-brand-code-rule';
import { applyBulletinCategory } from './apply-bulletin-category';
import { applyCarBrand } from './apply-car-brand';
import { applyCustomerGrade } from './apply-customer-grade';
import { applyDepartment } from './apply-department';
import { applyDiscountCode } from './apply-discount-code';
import { applyLeaveType } from './apply-leave-type';
import { applyMedalLevel } from './apply-medal-level';
import { applyPartBrand } from './apply-part-brand';
import { applyPartGroup } from './apply-part-group';
import { applyRole } from './apply-role';
import { applyTeam } from './apply-team';
import { applyUserTeam } from './apply-user-team';
import { applyWarehouse } from './apply-warehouse';
import { applyWelcomeBulletin } from './apply-welcome-bulletin';

export interface ApplyTemplateParams {
  tenantId: string;
  tier: SeedTier;
  actorUserId: string;
}

export async function applyTemplateToTenant(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, tier, actorUserId } = params;

  console.log(`▶ [TEMPLATE] 開始套用 tenantId=${tenantId} tier=${tier}`);

  // === ALL：所有版本皆需 ===
  await applyRole(prisma, params);
  await applyCarBrand(prisma, params);
  await applyBrandCodeRule(prisma, params); // ⚠️ 必須在 applyCarBrand 之後（FK car_brand_id）
  await applyPartGroup(prisma, params);
  await applyPartBrand(prisma, params);
  await applyCustomerGrade(prisma, params);
  await applyDiscountCode(prisma, params);
  await applyAccountCode(prisma, params);

  // === ALL：warehouse 依 tier 建不同數量（LITE 1 / PLUS 2 / PRO 6）===
  await applyWarehouse(prisma, params);

  // === PLUS+ ===
  if (tier === 'PLUS' || tier === 'PRO') {
    await applyDepartment(prisma, params);
    await applyTeam(prisma, params);  // ⚠️ 必須在 applyDepartment 之後（讀 department 建對應 team）
  }

  // === PRO 專屬 ===
  if (tier === 'PRO') {
    await applyLeaveType(prisma, params);
    await applyMedalLevel(prisma, params);
  }

  // === 權限矩陣（依 tier 載入對應 role_view）===
  await seedNx01RoleView(prisma, { tenantId, actorUserId, tier });

  // === ALL：公告分類（LITE 2 / PLUS+PRO 7、依賴 applyTeam 已建 default team）===
  await applyBulletinCategory(prisma, params);

  // === 歡迎公告（最後一步）===
  await applyWelcomeBulletin(prisma, params);

  console.log(`✅ [TEMPLATE] 完成套用 tenantId=${tenantId}`);
}
