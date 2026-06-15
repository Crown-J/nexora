// packages/db-core/prisma/seed/template/apply-transmission.ts
// @FUNCTION_CODE SYS-TMPL-SVC-004-F01
// 範本：變速箱型錄（ALL）。SYSADMIN seed apply 最小骨架（MT/AT/DCT/CVT 通用類別）。
// OWNER 業務日常自加品牌專用（DSG7 / TIP8 / ZF8AT 等）。
//
// 對應規格：docs/nx01/spec/intent/nx01-15-vehicle-classification.md v1.0 §4.5.1

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const ROWS = [
  { code: 'MT',  name: '手排變速箱',     nameEn: 'Manual Transmission',                transmissionType: 1, gearCount: null, sortNo: 1 },
  { code: 'AT',  name: '自動變速箱',     nameEn: 'Automatic Transmission',             transmissionType: 2, gearCount: null, sortNo: 2 },
  { code: 'DCT', name: '雙離合變速箱',   nameEn: 'Dual-Clutch Transmission',           transmissionType: 3, gearCount: null, sortNo: 3 },
  { code: 'CVT', name: '無段變速箱',     nameEn: 'Continuously Variable Transmission', transmissionType: 4, gearCount: null, sortNo: 4 },
];

export async function applyTransmission(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  for (const r of ROWS) {
    await prisma.nx01Transmission.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        nameEn: r.nameEn,
        transmissionType: r.transmissionType,
        gearCount: r.gearCount,
        // 2026-06-15 W6 品牌合表後對齊：carBrandId -> brandId（取代舊欄位）
        brandId: null,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      // 不覆蓋 tenant 客制（Q5=B 範式、name/sortNo 可調）
      update: { updatedBy: actorUserId },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_transmission_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_transmission), 0), 1), true)`,
  );

  console.log(`[TEMPLATE] applyTransmission: upserted ${ROWS.length} (tenant=${tenantId})`);
}
