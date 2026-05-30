// packages/db-core/prisma/seed/template/apply-role.ts
// @FUNCTION_CODE SYS-TMPL-SVC-001-F03
// 範本：每個租戶的職務角色
//
// 變更紀錄：
//   - 2026-05-06：7 角色 v1.0（SYSADMIN/OWNER/HR/SALES/PURCHASING/WAREHOUSE/FINANCE）
//   - 2026-05-30：v1.2 對齊軌 FU-07
//     刪除 SALES/PURCHASING/WAREHOUSE/FINANCE/HR 5 個預設角色
//     對齊 v1.2 §12.2「LITE 完全沒有預設角色、由負責人從零建」
//     + §13「系統預設角色範本（用戶完全從零建）」
//     僅保留 SYSADMIN（伊諾瓦跨租戶）+ OWNER（單租戶負責人）2 個系統角色

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const ROLE_SPECS = [
  { code: 'SYSADMIN', name: '系統管理員', isSystem: true, sortNo: 1, description: '全系統與租戶設定（伊諾瓦跨租戶）' },
  { code: 'OWNER',    name: '負責人',     isSystem: true, sortNo: 2, description: '老闆 / 總經理、全模組總覽（自動全權限）' },
];

const DEPRECATED_ROLE_CODES = ['HR', 'SALES', 'PURCHASING', 'WAREHOUSE', 'FINANCE'];

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

  // v1.2 對齊軌 FU-07：清掉預設 5 個非系統角色（若 seed 過舊版會有殘留）
  // 先清相關 RolePermission / UserRole 引用、再刪 Role
  const stale = await prisma.nx01Role.findMany({
    where: { tenantId, code: { in: DEPRECATED_ROLE_CODES } },
    select: { id: true, code: true },
  });
  if (stale.length) {
    const staleIds = stale.map((r) => r.id);
    await prisma.nx01RolePermission.deleteMany({
      where: { roleId: { in: staleIds } },
    });
    await prisma.nx01UserRole.deleteMany({
      where: { roleId: { in: staleIds } },
    });
    await prisma.nx01RoleView.deleteMany({
      where: { roleId: { in: staleIds } },
    });
    await prisma.nx01Role.deleteMany({
      where: { id: { in: staleIds } },
    });
    console.log(
      `⚠️ [TEMPLATE] applyRole 清除 deprecated 角色 ${stale.length} 筆 (tenant=${tenantId})：${stale.map((r) => r.code).join(', ')}`,
    );
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_role_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_role), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyRole: ${ROLE_SPECS.length} 筆 (tenant=${tenantId})`);
}
