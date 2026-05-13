// packages/db-core/prisma/seed/template/apply-brand-code-rule.ts
// @FUNCTION_CODE SYS-TMPL-SVC-003-F01
// 範本：品牌編碼規則（ALL）。SYSADMIN seed apply 4 條規則對應 4 主流 car_brand。
//
// 對應規格：docs/nx01/spec/intent/nx01-11-brand-code-rule.md v1.0 §5.1 / §11
//   階段 1：建 schema + 4 個品牌 seed（VAG / POR / BMW / BEN）
//
// 依賴：applyCarBrand 已先跑（apply-car-brand.ts 4 主流品牌寫入 tenant）
// 來源：規格 §1.1 範例 + Hank 自決通用範式（POR/BMW/BEN 詳細 SEG 結構待 Crown 補真相、
//       v1.0 用 VAG 範式作為 default、tenant 後續可調 separator + segDefinitions）

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

type SegDefinition = {
  seg_no: number;
  name: string;
  length_min: number;
  length_max: number;
  charset: 'numeric' | 'alpha' | 'alphanumeric' | 'any';
  required: boolean;
  description: string;
};

/** VAG 5-SEG 範式（規格 §1.1 範例：VAG-1K0·129·620·A #VALDEU） */
const VAG_SEG_DEFINITIONS: SegDefinition[] = [
  { seg_no: 1, name: '主類別代碼', length_min: 3, length_max: 3, charset: 'alphanumeric', required: true, description: 'VAG 車型大類（如 1K0 = Golf MK6）' },
  { seg_no: 2, name: '系統代碼', length_min: 3, length_max: 3, charset: 'numeric', required: true, description: 'VAG 系統分類（如 129 = 進氣系統）' },
  { seg_no: 3, name: '部品代碼', length_min: 3, length_max: 3, charset: 'numeric', required: true, description: 'VAG 部品代碼' },
  { seg_no: 4, name: '版本碼', length_min: 1, length_max: 1, charset: 'alphanumeric', required: false, description: '料號版本（如 A/B/C）' },
  { seg_no: 5, name: '廠商區隔碼', length_min: 1, length_max: 2, charset: 'alphanumeric', required: false, description: '廠商區隔' },
];

/** 4 主流品牌規則 seed（依規格 §4.3 對應 NX01-12 4 主流 car_brand） */
type RuleSeed = {
  carBrandCode: string;
  name: string;
  description: string;
  segCount: number;
  segDefinitions: SegDefinition[];
  example: string;
};

const RULES: RuleSeed[] = [
  {
    carBrandCode: 'VAG',
    name: 'VAG 標準料號結構',
    description: '對齊 VAG 集團原廠料號慣例（5 SEG + #BRAND3COUNTRY3 來源代碼）',
    segCount: 5,
    segDefinitions: VAG_SEG_DEFINITIONS,
    example: 'VAG-1K0·129·620·A #VALDEU',
  },
  {
    carBrandCode: 'POR',
    name: 'Porsche 標準料號結構',
    description: '對齊 Porsche 原廠料號慣例（v1.0 沿用 VAG 範式、tenant 後續可調）',
    segCount: 5,
    segDefinitions: VAG_SEG_DEFINITIONS,
    example: 'POR-991·113·400·A #BOSDEU',
  },
  {
    carBrandCode: 'BMW',
    name: 'BMW 標準料號結構',
    description: '對齊 BMW 原廠料號慣例（v1.0 沿用 VAG 範式、tenant 後續可調）',
    segCount: 5,
    segDefinitions: VAG_SEG_DEFINITIONS,
    example: 'BMW-F30·115·600·A #BOSDEU',
  },
  {
    carBrandCode: 'BEN',
    name: 'Mercedes-Benz 標準料號結構',
    description: '對齊 Mercedes-Benz 原廠料號慣例（v1.0 沿用 VAG 範式、tenant 後續可調）',
    segCount: 5,
    segDefinitions: VAG_SEG_DEFINITIONS,
    example: 'BEN-W205·203·100·A #BOSDEU',
  },
];

export async function applyBrandCodeRule(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  let created = 0;
  for (const r of RULES) {
    const carBrand = await prisma.nx01CarBrand.findFirst({
      where: { tenantId, code: r.carBrandCode },
      select: { id: true },
    });
    if (!carBrand) {
      console.warn(
        `[TEMPLATE] applyBrandCodeRule: car_brand ${r.carBrandCode} not found in tenant ${tenantId}, skip`,
      );
      continue;
    }

    await prisma.nx01BrandCodeRule.upsert({
      where: { tenantId_carBrandId: { tenantId, carBrandId: carBrand.id } },
      create: {
        tenantId,
        carBrandId: carBrand.id,
        name: r.name,
        description: r.description,
        segCount: r.segCount,
        segDefinitions: r.segDefinitions as unknown as object,
        separator: '·',
        sourceCodePrefix: '#',
        sourceCodeFormat: 'BRAND3+COUNTRY3',
        examplePartCode: r.example,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      // 不覆蓋 tenant 已調整的 separator / segDefinitions / examplePartCode（Q5=B 範式）
      update: {
        updatedBy: actorUserId,
      },
    });
    created += 1;
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_brand_code_rule_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_brand_code_rule), 0), 1), true)`,
  );

  console.log(
    `[TEMPLATE] applyBrandCodeRule: upserted ${created}/${RULES.length} rules (tenant=${tenantId})`,
  );
}
