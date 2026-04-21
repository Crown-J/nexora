// packages/db-core/prisma/seed/template/apply-part-group.ts
// @FUNCTION_CODE SYS-TMPL-SVC-003-F01
// 範本：零件分類（ALL，6 大類）。
// upsert by tenantId_code（migration 20260421132744_fix_tenant_scoped_unique 後）

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyPartGroup(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const rows = [
    { code: 'ENGINE',   name: '引擎系統',     sortNo: 1 },
    { code: 'BRAKE',    name: '煞車系統',     sortNo: 2 },
    { code: 'FILTER',   name: '濾清／油水',   sortNo: 3 },
    { code: 'ELECTRIC', name: '電系',         sortNo: 4 },
    { code: 'BODY',     name: '車身／底盤',   sortNo: 5 },
    { code: 'OTHER',    name: '其他',         sortNo: 99 },
  ];

  for (const r of rows) {
    await prisma.nx01PartGroup.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_part_group_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_part_group), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyPartGroup: ${rows.length} 筆 (tenant=${tenantId})`);
}
