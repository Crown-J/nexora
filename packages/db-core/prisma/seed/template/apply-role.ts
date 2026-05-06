// packages/db-core/prisma/seed/template/apply-role.ts
// @FUNCTION_CODE SYS-TMPL-SVC-001-F02
// 範本：每個租戶的職務角色（ALL，7 個職務、對齊 NX01-02 規格書 v1.0）。
//
// 變更紀錄：
//   - 2026-05-06 (TASK-PHASE2-NX01-USER-ROLE-SCHEMA-EXTEND-01)：
//     8 筆 → 7 筆。移除 LOGISTICS（業務由 partner_type=T 處理）+ HR_ADMIN（併入 HR）、加 OWNER。
//     對齊 NX01-02 規格書 v1.0 + Crown 拍 Q1+Q2+Q3。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const ROLE_SPECS = [
  { code: 'SYSADMIN',   name: '系統管理員', isSystem: true, sortNo: 1, description: '全系統與租戶設定' },
  { code: 'OWNER',      name: '負責人',     isSystem: true, sortNo: 2, description: '老闆 / 總經理、全模組總覽' },
  { code: 'HR',         name: '人資',       isSystem: true, sortNo: 3, description: '人資模組' },
  { code: 'SALES',      name: '業務',       isSystem: true, sortNo: 4, description: '銷售模組' },
  { code: 'PURCHASING', name: '採購',       isSystem: true, sortNo: 5, description: '採購模組' },
  { code: 'WAREHOUSE',  name: '倉管',       isSystem: true, sortNo: 6, description: '庫存／倉儲' },
  { code: 'FINANCE',    name: '財務',       isSystem: true, sortNo: 7, description: '財務模組' },
];

export async function applyRole(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  for (const spec of ROLE_SPECS) {
    await prisma.nx01Role.upsert({
      where: { tenantId_code: { tenantId, code: spec.code } },
      create: {
        tenantId,
        code: spec.code,
        name: spec.name,
        description: spec.description,
        isSystem: spec.isSystem,
        sortNo: spec.sortNo,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        name: spec.name,
        description: spec.description,
        isSystem: spec.isSystem,
        sortNo: spec.sortNo,
        isActive: true,
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_role_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_role), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyRole: ${ROLE_SPECS.length} 筆 (tenant=${tenantId})`);
}
