// packages/db-core/prisma/seed/system/nx99_system_tenant.ts
// @FUNCTION_CODE SYS-SEED-SVC-005-F01
// 系統內部租戶（SYSTEM）+ 系統管理員（SYSADMIN）成對建立。
//
// 設計重點：
// - SYSTEM 租戶承載 SYSADMIN 使用者，解決「Nx01User.tenantId 必填+FK」與
//   「SYSADMIN 不屬於任何業務租戶」之間的矛盾。
// - SYSTEM 租戶永遠 isActive=false，業務列表預設過濾 active 自動排除，
//   不需要每個查詢加 `code != 'SYSTEM'` 過濾邏輯。
//
// chicken-and-egg 處理：
// - nx99_tenant.created_by 在 schema 沒有 FK constraint，可填入尚未建立的
//   SYSADMIN_USER_ID。
// - nx01_user.created_by 有 FK 但「同 row 自參考」在 PostgreSQL 單一 INSERT
//   內仍合法（INSERT 結束時 row 'NX01USER0000001' 已存在，FK 檢查通過）。
// - 因此純 Prisma upsert 即可，不需要 SET session_replication_role。
//
// ⚠️ 此租戶與此使用者永遠不可刪除，不可設為 active。
// ⚠️ 業務邏輯不應存取此租戶的資料。

import type { PrismaClient } from '../../../generated/prisma';
import { DEFAULT_PASSWORD_HASH, SYSADMIN_USER_ID, SYSTEM_TENANT_ID } from './constants';

export async function seedSystemTenantAndSysAdmin(prisma: PrismaClient): Promise<void> {
  // 1. 先建 SYSTEM 租戶（created_by 無 FK，可指向尚未建立的 SYSADMIN）
  await prisma.nx99Tenant.upsert({
    where: { id: SYSTEM_TENANT_ID },
    create: {
      id: SYSTEM_TENANT_ID,
      code: 'SYSTEM',
      name: '系統內部租戶',
      nameEn: 'System Internal Tenant',
      status: 'A',
      sortNo: 9999,
      isActive: false,
      remark: 'Internal system tenant, DO NOT USE FOR BUSINESS',
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      code: 'SYSTEM',
      name: '系統內部租戶',
      nameEn: 'System Internal Tenant',
      status: 'A',
      sortNo: 9999,
      isActive: false,
      remark: 'Internal system tenant, DO NOT USE FOR BUSINESS',
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 2. 再建 SYSADMIN 使用者（tenantId 已存在 ✅、created_by 自參考同 row 合法）
  await prisma.nx01User.upsert({
    where: { id: SYSADMIN_USER_ID },
    create: {
      id: SYSADMIN_USER_ID,
      tenantId: SYSTEM_TENANT_ID,
      userAccount: 'sysadmin',
      passwordHash: DEFAULT_PASSWORD_HASH,
      userName: '系統管理員（SYSADMIN）',
      isActive: false,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      tenantId: SYSTEM_TENANT_ID,
      userAccount: 'sysadmin',
      passwordHash: DEFAULT_PASSWORD_HASH,
      userName: '系統管理員（SYSADMIN）',
      isActive: false,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 3. 同步 sequence
  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx99_tenant_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx99_tenant), 0), 1), true)`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_user_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_user), 0), 1), true)`,
  );

  console.log(`✅ [SYSTEM] SYSTEM 租戶與 SYSADMIN 建立完成`);
  console.log(`   - tenantId=${SYSTEM_TENANT_ID}`);
  console.log(`   - sysadminUserId=${SYSADMIN_USER_ID}`);
}
