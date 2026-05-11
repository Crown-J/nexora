// packages/db-core/prisma/seed/template/apply-team.ts
// @FUNCTION_CODE SYS-TMPL-SVC-013-F01
// 範本：團隊（PLUS+）。LITE skip。
//
// 業務真相（Crown 拍 Q2）：
//   每個 department 對應 1 default team、team.code = department.code、team.name = 'XX 預設組'。
//   schema 支援 1 department:N team、本 seed 僅建最小骨架（每 department 1 team）、
//   業務啟用時 admin 可手動加更多 team（如「採購一組 / 採購二組」）。
//
// 範式：依 nx01_department.findMany 動態建 team、不寫死 code。
//   容忍 main 命名 vs 軌 4 命名差異（PURCHASE / PRODUCT 都 OK）。
//
// 對齊軌 2 task：
//   PLUS：4 team（sortNo 1~4 / 對應 4 個 department）
//   PRO：6 team（sortNo 1~6 / 對應 6 個 department、含 LOGISTICS + HR）
//
// 依賴：必須在 applyDepartment 之後執行（讀 nx01_department 建對應 team）。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyTeam(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, tier, actorUserId } = params;

  if (tier === 'LITE') {
    console.log('⏭ [TEMPLATE] applyTeam: skipped (LITE)');
    return;
  }

  const departments = await prisma.nx01Department.findMany({
    where: { tenantId, isActive: true },
    orderBy: { sortNo: 'asc' },
    select: { id: true, code: true, name: true, sortNo: true },
  });

  if (departments.length === 0) {
    console.warn(
      `⚠️ [TEMPLATE] applyTeam: no department in tenant ${tenantId}、skipped`,
    );
    return;
  }

  let created = 0;
  let updated = 0;

  for (const d of departments) {
    const existing = await prisma.nx01Team.findFirst({
      where: { tenantId, departmentId: d.id, code: d.code },
      select: { id: true },
    });
    if (existing) {
      await prisma.nx01Team.update({
        where: { id: existing.id },
        data: {
          name: `${d.name}預設組`,
          sortNo: 1,
          isActive: true,
          updatedBy: actorUserId,
        },
      });
      updated += 1;
    } else {
      await prisma.nx01Team.create({
        data: {
          tenantId,
          departmentId: d.id,
          code: d.code,
          name: `${d.name}預設組`,
          sortNo: 1,
          isActive: true,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
      created += 1;
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_team_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_team), 0), 1), true)`,
  );

  console.log(
    `✅ [TEMPLATE] applyTeam: ${departments.length} 筆 (tenant=${tenantId} tier=${tier}、created=${created}/updated=${updated})`,
  );
}
