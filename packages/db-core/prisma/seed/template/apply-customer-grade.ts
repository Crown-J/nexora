// packages/db-core/prisma/seed/template/apply-customer-grade.ts
// @FUNCTION_CODE SYS-TMPL-SVC-005-F01
// 範本：客戶分級（ALL，A~D 四級）。
// schema 無 unique，採 findFirst+update/create pattern。

import { Prisma } from '../../../generated/prisma';
import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyCustomerGrade(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const rows = [
    { code: 'A', name: 'A 級客戶', marginPct: new Prisma.Decimal('12.0'), sortNo: 1 },
    { code: 'B', name: 'B 級客戶', marginPct: new Prisma.Decimal('15.0'), sortNo: 2 },
    { code: 'C', name: 'C 級客戶', marginPct: new Prisma.Decimal('18.0'), sortNo: 3 },
    { code: 'D', name: 'D 級客戶', marginPct: new Prisma.Decimal('22.0'), sortNo: 4 },
  ];

  for (const r of rows) {
    const existing = await prisma.nx01CustomerGrade.findFirst({
      where: { tenantId, code: r.code },
    });
    if (existing) {
      await prisma.nx01CustomerGrade.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          marginPct: r.marginPct,
          sortNo: r.sortNo,
          isActive: true,
          updatedBy: actorUserId,
        },
      });
    } else {
      await prisma.nx01CustomerGrade.create({
        data: {
          tenantId,
          code: r.code,
          name: r.name,
          marginPct: r.marginPct,
          sortNo: r.sortNo,
          isActive: true,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_customer_grade_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_customer_grade), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyCustomerGrade: ${rows.length} 筆 (tenant=${tenantId})`);
}
