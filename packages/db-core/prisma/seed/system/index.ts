// packages/db-core/prisma/seed/system/index.ts
// @FUNCTION_CODE SYS-SEED-SVC-003-F01
// 系統層 seed 入口：所有環境（DEV / STAGING / PROD）皆執行。

import type { PrismaClient } from '../../../generated/prisma';
import { seedNx01Country } from './nx01_country';
import { seedNx01Currency } from './nx01_currency';
import { seedNx01Permission } from './nx01_permission';
import { seedNx01View } from './nx01_view';
import { seedNx01WarehouseType } from './nx01_warehouse_type';
import { seedInnovaTenantAndAdmin } from './nx99_innova_tenant';
import { seedNx99Plan } from './nx99_plan';
import { seedPlatformAdmin } from './platform_admin';
import { seedSystemTenantAndSysAdmin } from './nx99_system_tenant';

export async function runSystemSeed(prisma: PrismaClient): Promise<void> {
  console.log('▶ [SYSTEM] 開始執行系統層 seed...');

  // 1. SYSTEM 租戶 + SYSADMIN 必須最先：後續所有 seed 的 createdBy 都會引用 SYSADMIN_USER_ID。
  await seedSystemTenantAndSysAdmin(prisma);

  // 2. 系統主檔（不隸屬任何租戶的全域資料）
  await seedNx01View(prisma);          // 118 個畫面（CSV）
  await seedNx99Plan(prisma);          // 9 個訂閱方案
  await seedNx01Currency(prisma);      // ISO 4217
  await seedNx01Country(prisma);       // ISO 3166-1 alpha-3
  await seedNx01WarehouseType(prisma); // 倉庫類型 H/M/W/S（全域型錄，schema 無 tenantId）
  await seedNx01Permission(prisma);    // v1.2 對齊軌 A+B：系統權限目錄

  // 3. INNOVA 營運主體（⚠️ 過渡期保留、Phase 6 退役）：
  //    伊諾瓦跨租戶後台 v1 做法、innova-admin 持 SYSADMIN 角色掛 nx01_user。
  //    必須在 seedNx01Permission 之後（角色目錄已存在）。
  await seedInnovaTenantAndAdmin(prisma);

  // 4. 平台層營運超管（⭐ 平台/租戶層分離軌 Phase 1）：
  //    平台層獨立、不掛任何租戶。Phase 6 完成後成為唯一伊諾瓦營運入口。
  await seedPlatformAdmin(prisma);

  console.log('✅ [SYSTEM] 系統層 seed 完成');
}
