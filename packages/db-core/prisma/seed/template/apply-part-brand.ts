// packages/db-core/prisma/seed/template/apply-part-brand.ts
// @FUNCTION_CODE SYS-TMPL-SVC-004-F01
// 範本：零件品牌（ALL，10 個 VAG/Bosch/Hella 等）。
//
// 2026-06-15 W6 品牌合表後對齊：Nx01PartBrand 已合進 Nx01Brand（isCar/isPart 雙旗標）
//   - 零件品牌 = Nx01Brand with isPart=true、車品牌 = Nx01Brand with isCar=true
//   - 同 code 可雙開（VAG 同時是車品牌與零件品牌時、單筆 row 兩旗標都 true）
//   - upsert by tenantId_code（兩種 brand 共用 unique）

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyPartBrand(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const deu = await prisma.nx01Country.findUnique({ where: { code: 'DEU' } });
  const rows = [
    { code: 'VAG', name: 'Volkswagen Group OE', countryId: deu?.id ?? null, sortNo: 1 },
    { code: 'BOS', name: 'Bosch',               countryId: deu?.id ?? null, sortNo: 2 },
    { code: 'HEL', name: 'Hella',               countryId: deu?.id ?? null, sortNo: 3 },
    { code: 'MAN', name: 'Mann-Filter',         countryId: deu?.id ?? null, sortNo: 4 },
    { code: 'MAH', name: 'Mahle',               countryId: deu?.id ?? null, sortNo: 5 },
    { code: 'LEM', name: 'Lemförder',           countryId: deu?.id ?? null, sortNo: 6 },
    { code: 'SAC', name: 'Sachs (ZF)',          countryId: deu?.id ?? null, sortNo: 7 },
    { code: 'ATE', name: 'ATE Brakes',          countryId: deu?.id ?? null, sortNo: 8 },
    { code: 'NGK', name: 'NGK',                 countryId: deu?.id ?? null, sortNo: 9 },
    { code: 'GEN', name: '通用副廠',            countryId: null,            sortNo: 99 },
  ];

  for (const r of rows) {
    await prisma.nx01Brand.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        countryId: r.countryId,
        isCar: false,
        isPart: true,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        isPart: true,           // 確保標記、不覆蓋 isCar（避免 partBrand seed 把已建的車品牌 isCar 抹掉）
        name: r.name,
        countryId: r.countryId,
        sortNo: r.sortNo,
        isActive: true,
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_brand_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_brand), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyPartBrand: ${rows.length} 筆 (tenant=${tenantId})`);
}
