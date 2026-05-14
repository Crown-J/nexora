// packages/db-core/prisma/seed/template/apply-model-type.ts
// @FUNCTION_CODE SYS-TMPL-SVC-006-F01
// 範本：車體類型型錄（ALL）。SYSADMIN seed 5 主流類別涵蓋業界 70% 車型。
// OWNER 業務需要時新增（WAG / CON / PUP / VAN 等）。
//
// 對應規格：docs/nx01/spec/intent/nx01-15-vehicle-classification.md v1.0 §4.5.3

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const ROWS = [
  { code: 'SED', name: '轎車',         nameEn: 'Sedan',     sortNo: 1 },
  { code: 'HAT', name: '掀背',         nameEn: 'Hatchback', sortNo: 2 },
  { code: 'SUV', name: '休旅車',       nameEn: 'SUV',       sortNo: 3 },
  { code: 'CPE', name: '跑車',         nameEn: 'Coupe',     sortNo: 4 },
  { code: 'MPV', name: '多功能廂式',   nameEn: 'MPV',       sortNo: 5 },
];

export async function applyModelType(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  for (const r of ROWS) {
    await prisma.nx01ModelType.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        nameEn: r.nameEn,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: { updatedBy: actorUserId },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_model_type_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_model_type), 0), 1), true)`,
  );

  console.log(`[TEMPLATE] applyModelType: upserted ${ROWS.length} (tenant=${tenantId})`);
}
