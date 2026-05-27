// packages/db-core/prisma/seed/template/apply-brand-code-rule.ts
// @FUNCTION_CODE SYS-TMPL-SVC-003-F01
// 範本：品牌料號規則（ALL）。下半場 A 軸翻轉後對應「零件品牌」。
// 每個零件品牌 seed 一條預設規則「{code} 標準料號」（SEG 3·3·3·1，可調整）。
// 依賴：applyPartBrand 已先跑（規則對應零件品牌）。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyBrandCodeRule(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const brands = await prisma.nx01PartBrand.findMany({
    where: { tenantId },
    select: { id: true, code: true },
  });

  let created = 0;
  for (const b of brands) {
    const name = `${b.code} 標準料號`;
    await prisma.nx01BrandCodeRule.upsert({
      where: { tenantId_partBrandId_name: { tenantId, partBrandId: b.id, name } },
      create: {
        tenantId,
        partBrandId: b.id,
        name,
        description: `${b.code} 預設料號分段規則（可調整）`,
        seg1Length: 3,
        seg2Length: 3,
        seg3Length: 3,
        seg4Length: 1,
        seg5Length: 0,
        separator: '·',
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      // 不覆蓋 tenant 已調整的 SEG 設定
      update: { updatedBy: actorUserId },
    });
    created += 1;
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_brand_code_rule_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_brand_code_rule), 0), 1), true)`,
  );

  console.log(`[TEMPLATE] applyBrandCodeRule: ${created} rules (tenant=${tenantId})`);
}
