// packages/db-core/prisma/seed/template/apply-discount-code.ts
// @FUNCTION_CODE SYS-TMPL-SVC-006-F01
// 範本：折扣代碼（ALL）。
// schema 無 unique，採 findFirst+update/create pattern。

import { Prisma } from '../../../generated/prisma';
import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyDiscountCode(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const rows = [
    { code: 'DEFECT', name: '瑕疵品折扣',     discountType: 'P', discountValue: new Prisma.Decimal('15.0'), managedBy: 'P' },
    { code: 'USED',   name: '中古件折扣',     discountType: 'P', discountValue: new Prisma.Decimal('20.0'), managedBy: 'P' },
    { code: 'VIP',    name: 'VIP 客戶折扣',   discountType: 'P', discountValue: new Prisma.Decimal('5.0'),  managedBy: 'S' },
    { code: 'BULK',   name: '大量採購折扣',   discountType: 'P', discountValue: new Prisma.Decimal('8.0'),  managedBy: 'S' },
  ];

  for (const r of rows) {
    const existing = await prisma.nx01DiscountCode.findFirst({
      where: { tenantId, code: r.code },
    });
    if (existing) {
      await prisma.nx01DiscountCode.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          discountType: r.discountType,
          discountValue: r.discountValue,
          managedBy: r.managedBy,
          isActive: true,
          updatedBy: actorUserId,
        },
      });
    } else {
      await prisma.nx01DiscountCode.create({
        data: {
          tenantId,
          code: r.code,
          name: r.name,
          discountType: r.discountType,
          discountValue: r.discountValue,
          managedBy: r.managedBy,
          isActive: true,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_discount_code_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_discount_code), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyDiscountCode: ${rows.length} 筆 (tenant=${tenantId})`);
}
