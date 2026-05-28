// packages/db-core/prisma/seed/template/apply-supplier-grade.ts
// LITE 階段 1 M2-c：供應商分級範本（ALL，A~D 四級）。
// 對齊 customer-grade 範式：A 最優 / D 最差、依「付款條件對我方有利程度」排序。
// 業務語意（Crown 拍板）：初期沒數據先用「付款條件」算等級；信用紀錄/不良率累積後再補。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applySupplierGrade(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const rows = [
    {
      code: 'A',
      name: 'A 級供應商',
      description: '優質供應商（付款條件 NET90 對我方最有利、信用佳、不良率低）',
      sortNo: 1,
    },
    {
      code: 'B',
      name: 'B 級供應商',
      description: '良好供應商（NET60 付款條件、品質穩定）',
      sortNo: 2,
    },
    {
      code: 'C',
      name: 'C 級供應商',
      description: '一般供應商（NET30 標準付款條件）',
      sortNo: 3,
    },
    {
      code: 'D',
      name: 'D 級供應商',
      description: '需現金交易（PREPAY 先付款、信用紀錄差或不良率高）',
      sortNo: 4,
    },
  ];

  for (const r of rows) {
    const existing = await prisma.nx01SupplierGrade.findFirst({
      where: { tenantId, code: r.code },
    });
    if (existing) {
      await prisma.nx01SupplierGrade.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          description: r.description,
          sortNo: r.sortNo,
          isActive: true,
          updatedBy: actorUserId,
        },
      });
    } else {
      await prisma.nx01SupplierGrade.create({
        data: {
          tenantId,
          code: r.code,
          name: r.name,
          description: r.description,
          sortNo: r.sortNo,
          isActive: true,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_supplier_grade_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_supplier_grade), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applySupplierGrade: ${rows.length} 筆 (tenant=${tenantId})`);
}
