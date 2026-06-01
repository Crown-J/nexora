// packages/db-core/prisma/seed/system/nx99_innova_tenant.ts
// @FUNCTION_CODE SYS-SEED-SVC-006-F01
// 伊諾瓦（NEXORA team）營運主體：跨租戶後台超級管理員。
//
// 設計重點：
// - INNOVA 是 NEXORA 自家的正式營運租戶（業務簽約幫客戶開戶用）。
// - 與 SYSTEM 內部佔位租戶（isActive=false）區隔：
//     * SYSTEM/sysadmin = 純佔位、不可登入、僅用於 createdBy 追溯歷史資料。
//     * INNOVA/innova-admin = 可登入的營運身分、有 SYSADMIN 跨租戶角色。
// - 不訂閱任何 plan（純營運、非業務租戶）。
// - 不套用 applyTemplateToTenant 全套（INNOVA 不做業務、避免污染倉庫/部門等主檔）；
//   僅 inline 建立 SYSADMIN + OWNER 兩個系統角色、指派 SYSADMIN 給 innova-admin。
// - innova-admin 預設密碼 Nexoragrid2026、mustChangePassword=true（首次登入強制改密）。

import type { PrismaClient } from '../../../generated/prisma';
import { DEFAULT_PASSWORD_HASH, SYSADMIN_USER_ID } from './constants';

/** 伊諾瓦營運租戶 ID（緊接 SYSTEM 0000000、系統營運層保留段） */
export const INNOVA_TENANT_ID = 'NX99TANT0000001';

/** 伊諾瓦營運超管 ID（緊接 SYSADMIN 0000001） */
export const INNOVA_ADMIN_USER_ID = 'NX01USER0000002';

/** 伊諾瓦營運租戶 code（登入「公司帳號」欄） */
export const INNOVA_TENANT_CODE = 'INNOVA';

/** 伊諾瓦營運超管帳號 */
export const INNOVA_ADMIN_ACCOUNT = 'innova-admin';

const ROLE_SPECS = [
  { code: 'SYSADMIN', name: '系統管理員', isSystem: true, sortNo: 1, description: '全系統與租戶設定（伊諾瓦跨租戶）' },
  { code: 'OWNER',    name: '負責人',     isSystem: true, sortNo: 2, description: '老闆 / 總經理、全模組總覽（自動全權限）' },
];

export async function seedInnovaTenantAndAdmin(prisma: PrismaClient): Promise<void> {
  // 1. 建立 INNOVA 營運租戶（isActive=true、不訂閱）
  await prisma.nx99Tenant.upsert({
    where: { id: INNOVA_TENANT_ID },
    create: {
      id: INNOVA_TENANT_ID,
      code: INNOVA_TENANT_CODE,
      name: '伊諾瓦科技有限公司',
      nameEn: 'Innova Technology Co., Ltd.',
      status: 'A',
      sortNo: 1,
      isActive: true,
      remark: 'NEXORA team operations tenant — cross-tenant onboarding admin lives here',
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      code: INNOVA_TENANT_CODE,
      name: '伊諾瓦科技有限公司',
      nameEn: 'Innova Technology Co., Ltd.',
      status: 'A',
      sortNo: 1,
      isActive: true,
      remark: 'NEXORA team operations tenant — cross-tenant onboarding admin lives here',
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 2. 建立 innova-admin 超管使用者
  await prisma.nx01User.upsert({
    where: { id: INNOVA_ADMIN_USER_ID },
    create: {
      id: INNOVA_ADMIN_USER_ID,
      tenantId: INNOVA_TENANT_ID,
      userAccount: INNOVA_ADMIN_ACCOUNT,
      passwordHash: DEFAULT_PASSWORD_HASH,
      userName: '伊諾瓦營運管理員',
      email: 'admin@innova.local',
      isActive: true,
      mustChangePassword: true,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      tenantId: INNOVA_TENANT_ID,
      userAccount: INNOVA_ADMIN_ACCOUNT,
      userName: '伊諾瓦營運管理員',
      email: 'admin@innova.local',
      isActive: true,
      // 注意：mustChangePassword 與 passwordHash 在 update 不覆寫，
      // 讓 innova-admin 改完密碼後重跑 seed 不會把密碼重置。
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 3. inline 建立 SYSADMIN + OWNER 兩個系統角色（不跑 applyTemplateToTenant 全套）
  for (const spec of ROLE_SPECS) {
    await prisma.nx01Role.upsert({
      where: { tenantId_code: { tenantId: INNOVA_TENANT_ID, code: spec.code } },
      create: {
        tenantId: INNOVA_TENANT_ID,
        code: spec.code,
        name: spec.name,
        description: spec.description,
        isSystem: spec.isSystem,
        sortNo: spec.sortNo,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: spec.name,
        description: spec.description,
        isSystem: spec.isSystem,
        sortNo: spec.sortNo,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  // 4. 指派 SYSADMIN 角色給 innova-admin
  const sysadminRole = await prisma.nx01Role.findFirstOrThrow({
    where: { tenantId: INNOVA_TENANT_ID, code: 'SYSADMIN' },
  });
  const existing = await prisma.nx01UserRole.findFirst({
    where: {
      tenantId: INNOVA_TENANT_ID,
      userId: INNOVA_ADMIN_USER_ID,
      roleId: sysadminRole.id,
    },
  });
  if (!existing) {
    await prisma.nx01UserRole.create({
      data: {
        tenantId: INNOVA_TENANT_ID,
        userId: INNOVA_ADMIN_USER_ID,
        roleId: sysadminRole.id,
        isPrimary: true,
        assignedBy: SYSADMIN_USER_ID,
      },
    });
  }

  // 5. 同步 sequence（避免後續 customer ID 衝突）
  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx99_tenant_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx99_tenant), 0), 1), true)`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_user_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_user), 0), 1), true)`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_role_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_role), 0), 1), true)`,
  );

  console.log(`✅ [SYSTEM] INNOVA 營運租戶與 innova-admin 建立完成`);
  console.log(`   - tenantId=${INNOVA_TENANT_ID} code=${INNOVA_TENANT_CODE}`);
  console.log(`   - adminUserId=${INNOVA_ADMIN_USER_ID} account=${INNOVA_ADMIN_ACCOUNT}`);
}
