// packages/db-core/prisma/seed/template/apply-leave-type.ts
// @FUNCTION_CODE SYS-TMPL-SVC-010-F01
// 範本：假別（PRO，6 種）。非 PRO skip。
// schema 無 unique，採 findFirst+update/create pattern。

import { Prisma } from '../../../generated/prisma';
import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyLeaveType(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, tier, actorUserId } = params;

  if (tier !== 'PRO') {
    console.log('⏭ [TEMPLATE] applyLeaveType: skipped (非 PRO)');
    return;
  }

  const rows = [
    { code: 'ANNUAL',   name: '特休',   isPaid: true,  maxDaysPerYear: new Prisma.Decimal('10.0'), minApplyHours: new Prisma.Decimal('8.0'), sortNo: 1 },
    { code: 'SICK',     name: '病假',   isPaid: true,  maxDaysPerYear: new Prisma.Decimal('30.0'), minApplyHours: new Prisma.Decimal('8.0'), sortNo: 2 },
    { code: 'PERSONAL', name: '事假',   isPaid: false, maxDaysPerYear: null,                       minApplyHours: new Prisma.Decimal('8.0'), sortNo: 3 },
    { code: 'MENSTR',   name: '生理假', isPaid: false, maxDaysPerYear: new Prisma.Decimal('12.0'), minApplyHours: new Prisma.Decimal('8.0'), sortNo: 4 },
    { code: 'MARRY',    name: '婚假',   isPaid: true,  maxDaysPerYear: new Prisma.Decimal('8.0'),  minApplyHours: new Prisma.Decimal('8.0'), sortNo: 5 },
    { code: 'FUNERAL',  name: '喪假',   isPaid: true,  maxDaysPerYear: null,                       minApplyHours: new Prisma.Decimal('8.0'), sortNo: 6 },
  ];

  for (const r of rows) {
    const existing = await prisma.nx07LeaveType.findFirst({
      where: { tenantId, code: r.code },
    });
    if (existing) {
      await prisma.nx07LeaveType.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          isPaid: r.isPaid,
          maxDaysPerYear: r.maxDaysPerYear,
          minApplyHours: r.minApplyHours,
          needApproval: true,
          isSystem: true,
          isActive: true,
          sortNo: r.sortNo,
          updatedBy: actorUserId,
        },
      });
    } else {
      await prisma.nx07LeaveType.create({
        data: {
          tenantId,
          code: r.code,
          name: r.name,
          isPaid: r.isPaid,
          maxDaysPerYear: r.maxDaysPerYear,
          minApplyHours: r.minApplyHours,
          needApproval: true,
          isSystem: true,
          isActive: true,
          sortNo: r.sortNo,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx07_leave_type_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx07_leave_type), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyLeaveType: ${rows.length} 筆 (tenant=${tenantId})`);
}
