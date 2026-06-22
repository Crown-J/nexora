// packages/db-core/prisma/seed/template/apply-region.ts
// 範本：地區基本資料（ALL，5 筆台灣銷售區）。
// 業務語意（執行長 2026-06-22 拍板）：客戶分類用、不是地址用、跟 nx01_city 縣市無關。
// schema unique 是 (tenantId, code)、採 findFirst+update/create pattern。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyRegion(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const rows = [
    { code: 'N', name: '北部', sortNo: 1 },
    { code: 'C', name: '中部', sortNo: 2 },
    { code: 'S', name: '南部', sortNo: 3 },
    { code: 'E', name: '東部', sortNo: 4 },
    { code: 'I', name: '離島', sortNo: 5 },
  ];

  for (const r of rows) {
    const existing = await prisma.nx01Region.findFirst({
      where: { tenantId, code: r.code },
    });
    if (existing) {
      await prisma.nx01Region.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          sortNo: r.sortNo,
          isActive: true,
          updatedBy: actorUserId,
        },
      });
    } else {
      await prisma.nx01Region.create({
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
    `SELECT setval('seq_nx01_region_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_region), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyRegion: ${rows.length} 筆 (tenant=${tenantId})`);
}
