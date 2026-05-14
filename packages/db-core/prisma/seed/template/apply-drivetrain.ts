// packages/db-core/prisma/seed/template/apply-drivetrain.ts
// @FUNCTION_CODE SYS-TMPL-SVC-005-F01
// 範本：傳動方式型錄（ALL）。SYSADMIN seed 4 核心傳動方式涵蓋業界 95% 燃油車。
// OWNER 業務需要時新增（EV 雙馬達 / Hybrid AWD / MR / RR 等）。
//
// 對應規格：docs/nx01/spec/intent/nx01-15-vehicle-classification.md v1.0 §4.5.2

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const ROWS = [
  { code: 'FF',  name: '前置前驅',   nameEn: 'Front-Engine Front-Wheel Drive', sortNo: 1 },
  { code: 'FR',  name: '前置後驅',   nameEn: 'Front-Engine Rear-Wheel Drive',  sortNo: 2 },
  { code: '4WD', name: '四輪驅動',   nameEn: 'Four-Wheel Drive',               sortNo: 3 },
  { code: 'AWD', name: '全時四驅',   nameEn: 'All-Wheel Drive',                sortNo: 4 },
];

export async function applyDrivetrain(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  for (const r of ROWS) {
    await prisma.nx01Drivetrain.upsert({
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
    `SELECT setval('seq_nx01_drivetrain_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_drivetrain), 0), 1), true)`,
  );

  console.log(`[TEMPLATE] applyDrivetrain: upserted ${ROWS.length} (tenant=${tenantId})`);
}
