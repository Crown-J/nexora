// packages/db-core/prisma/seed/system/nx99_innova_tenant.ts
// @FUNCTION_CODE SYS-SEED-SVC-006-F02
// ⚠️ 已退役（Phase 6.4、2026-06-02）：營運主體已遷 platform_admin 表。
//
// 為什麼還留檔：
// - INNOVA 租戶 + nx01_user innova-admin 兩筆 row 保留（不刪）、維持 createdBy 歷史追溯
// - 若 seed 重跑、保留 upsert 確保 row 存在、但強制 isActive=false（不可登入）
// - 名稱欄位（INNOVA_TENANT_ID 等）仍 export、供歷史程式碼可能引用
//
// 設計：
// - SYSTEM/sysadmin = 純佔位、is_active=false（不可登入、createdBy 追溯）
// - INNOVA/innova-admin（本檔）= 已退役、is_active=false（不可登入、createdBy 追溯）
// - platform_admin/innova-admin（Phase 1 後正式）= 平台超管、is_active=true
//
// 客戶端登入「公司帳號」用 nx99_tenant.code、INNOVA isActive=false 會被 auth.service.ts:81 擋。

import type { PrismaClient } from '../../../generated/prisma';
import { DEFAULT_PASSWORD_HASH, SYSADMIN_USER_ID } from './constants';

/** 伊諾瓦營運租戶 ID（已退役、保留為歷史 createdBy 來源） */
export const INNOVA_TENANT_ID = 'NX99TANT0000001';

/** 伊諾瓦營運超管 ID（已退役） */
export const INNOVA_ADMIN_USER_ID = 'NX01USER0000002';

/** 伊諾瓦營運租戶 code（已退役） */
export const INNOVA_TENANT_CODE = 'INNOVA';

/** 伊諾瓦營運超管帳號（已退役） */
export const INNOVA_ADMIN_ACCOUNT = 'innova-admin';

const ROLE_SPECS = [
  { code: 'SYSADMIN', name: '系統管理員', isSystem: true, sortNo: 1, description: '全系統與租戶設定（伊諾瓦跨租戶）' },
  { code: 'OWNER',    name: '負責人',     isSystem: true, sortNo: 2, description: '老闆 / 總經理、全模組總覽（自動全權限）' },
];

const RETIRED_REMARK =
  'RETIRED 2026-06-02 Phase 6.4: 營運主體已遷 platform_admin 表、此 row 保留純粹是 createdBy 歷史追溯來源、不可登入';

export async function seedInnovaTenantAndAdmin(prisma: PrismaClient): Promise<void> {
  // 1. INNOVA 租戶 upsert：強制 isActive=false（已退役、不可登入）
  await prisma.nx99Tenant.upsert({
    where: { id: INNOVA_TENANT_ID },
    create: {
      id: INNOVA_TENANT_ID,
      code: INNOVA_TENANT_CODE,
      name: '伊諾瓦科技有限公司',
      nameEn: 'Innova Technology Co., Ltd.',
      status: 'A',
      sortNo: 1,
      isActive: false,
      remark: RETIRED_REMARK,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      // 重跑 seed 一律強制 isActive=false（無論之前狀態為何）
      isActive: false,
      remark: RETIRED_REMARK,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 2. innova-admin nx01_user upsert：強制 isActive=false
  await prisma.nx01User.upsert({
    where: { id: INNOVA_ADMIN_USER_ID },
    create: {
      id: INNOVA_ADMIN_USER_ID,
      tenantId: INNOVA_TENANT_ID,
      userAccount: INNOVA_ADMIN_ACCOUNT,
      passwordHash: DEFAULT_PASSWORD_HASH,
      userName: '伊諾瓦營運管理員（已退役）',
      email: 'admin@innova.local',
      isActive: false,
      mustChangePassword: false,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      // 重跑 seed 一律強制 isActive=false（已退役、不可登入）
      isActive: false,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  // 3. 保留 SYSADMIN + OWNER 兩個系統角色（用作歷史 audit、不影響功能）
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

  // 4. innova-admin 的 SYSADMIN 指派保留（無傷、user 已 isActive=false 永遠進不來）

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

  console.log(`⏸ [SYSTEM] INNOVA 退役狀態確認（Phase 6.4）`);
  console.log(`   - tenant=${INNOVA_TENANT_ID} code=${INNOVA_TENANT_CODE} isActive=false`);
  console.log(`   - user=${INNOVA_ADMIN_USER_ID} account=${INNOVA_ADMIN_ACCOUNT} isActive=false`);
  console.log(`   - 平台超管已遷 platform_admin 表、見 platform_admin.ts`);
}
