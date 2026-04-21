// packages/db-core/prisma/seed/template/apply-car-brand.ts
// @FUNCTION_CODE SYS-TMPL-SVC-002-F01
// 範本：車廠品牌（ALL）。每個租戶獨立配置自己代理的車品牌。
// upsert by tenantId_code（migration 20260421132744_fix_tenant_scoped_unique 後）

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyCarBrand(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const twn = await prisma.nx01Country.findUnique({ where: { code: 'TWN' } });
  const rows = [
    { code: 'VW',      name: 'Volkswagen', countryId: twn?.id ?? null, sortNo: 1 },
    { code: 'AUDI',    name: 'Audi',       countryId: twn?.id ?? null, sortNo: 2 },
    { code: 'SKODA',   name: 'Škoda',      countryId: twn?.id ?? null, sortNo: 3 },
    { code: 'SEAT',    name: 'SEAT',       countryId: twn?.id ?? null, sortNo: 4 },
    { code: 'PORSCHE', name: 'Porsche',    countryId: twn?.id ?? null, sortNo: 5 },
  ];

  for (const r of rows) {
    await prisma.nx01CarBrand.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        countryId: r.countryId,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        name: r.name,
        countryId: r.countryId,
        sortNo: r.sortNo,
        isActive: true,
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_car_brand_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_car_brand), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyCarBrand: ${rows.length} 筆 (tenant=${tenantId})`);
}
