// packages/db-core/prisma/seed/template/apply-department.ts
// @FUNCTION_CODE SYS-TMPL-SVC-009-F01
// 範本：部門（PLUS+）。LITE skip。
// PLUS：4 個（採購/業務/倉儲/財務）
// PRO：6 個（PLUS 4 個 + 物流/人資）
// schema 無 unique，採 findFirst+update/create pattern。

import type { PrismaClient } from '../../../generated/prisma';
import type { SeedTier } from '../lib/seed-tier';
import type { ApplyTemplateParams } from './index';

interface DepartmentRow {
  code: string;
  name: string;
  sortNo: number;
}

function departmentRowsForTier(tier: SeedTier): DepartmentRow[] {
  if (tier === 'PRO') {
    return [
      { code: 'PURCHASE',  name: '採購部', sortNo: 1 },
      { code: 'SALES',     name: '業務部', sortNo: 2 },
      { code: 'WAREHOUSE', name: '倉儲部', sortNo: 3 },
      { code: 'FINANCE',   name: '財務部', sortNo: 4 },
      { code: 'LOGISTICS', name: '物流部', sortNo: 5 },
      { code: 'HR',        name: '人資部', sortNo: 6 },
    ];
  }
  // PLUS：4 部門
  return [
    { code: 'PURCHASE',  name: '採購部', sortNo: 1 },
    { code: 'SALES',     name: '業務部', sortNo: 2 },
    { code: 'WAREHOUSE', name: '倉儲部', sortNo: 3 },
    { code: 'FINANCE',   name: '財務部', sortNo: 4 },
  ];
}

export async function applyDepartment(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, tier, actorUserId } = params;

  if (tier === 'LITE') {
    console.log('⏭ [TEMPLATE] applyDepartment: skipped (LITE)');
    return;
  }

  const rows = departmentRowsForTier(tier);

  for (const r of rows) {
    const existing = await prisma.nx01Department.findFirst({
      where: { tenantId, code: r.code },
    });
    if (existing) {
      await prisma.nx01Department.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          sortNo: r.sortNo,
          isActive: true,
          updatedBy: actorUserId,
        },
      });
    } else {
      await prisma.nx01Department.create({
        data: {
          tenantId,
          code: r.code,
          name: r.name,
          sortNo: r.sortNo,
          isActive: true,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_department_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_department), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyDepartment: ${rows.length} 筆 (tenant=${tenantId} tier=${tier})`);
}
