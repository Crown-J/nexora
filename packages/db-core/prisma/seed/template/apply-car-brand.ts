// packages/db-core/prisma/seed/template/apply-car-brand.ts
// @FUNCTION_CODE SYS-TMPL-SVC-002-F02
// 範本：車型品牌（ALL）。SYSADMIN seed apply 4 主流品牌、tenant 可加自家經營副廠。
//
// 對應規格：docs/nx01/spec/intent/nx01-12-car-brand.md v1.0 §4.3
//   Crown 拍 Q1=A：4 主流品牌（VAG/POR/BMW/BEN、全 DEU）
//   Crown 拍 Q5=B：seed 修改僅鎖 code、其他欄位 tenant 完全可調
//
// 歷史 fact（A 系列 candidate、本軌 worklog 主題 10 登錄）：
//   既有 5 個 VAG 子品牌（VW / AUDI / SKODA / SEAT / PORSCHE、全 TWN）
//   = 過去 muscle memory 錯誤（業務真相：這 5 個皆 DEU 德國品牌、TWN 應為總代理進口、非原產國）
//   本軌 cleanup：每 tenant apply 時刪舊 5 個 code、upsert 新 4 個
//
// upsert by tenantId_code（migration 20260421132744_fix_tenant_scoped_unique 後）

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

/** 舊 5 個 VAG 子品牌（歷史 drift、本軌 cleanup） */
const LEGACY_CODES = ['VW', 'AUDI', 'SKODA', 'SEAT', 'PORSCHE'];

export async function applyCarBrand(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  // 對齊規格 §4.3：4 主流品牌 + 全 DEU
  const deu = await prisma.nx01Country.findUnique({ where: { code: 'DEU' } });
  if (!deu) throw new Error('seed: nx01_country DEU not found (run nx01_country system seed first)');

  const rows = [
    { code: 'VAG', name: '福斯集團',  nameEn: 'Volkswagen AG',   sortNo: 1 },
    { code: 'POR', name: '保時捷',    nameEn: 'Porsche',         sortNo: 2 },
    { code: 'BMW', name: 'BMW',       nameEn: 'BMW',             sortNo: 3 },
    { code: 'BEN', name: '賓士',      nameEn: 'Mercedes-Benz',   sortNo: 4 },
  ];

  // Cleanup：刪舊 5 個 VAG 子品牌（歷史 fact 校正、限該 tenant、僅刪未被引用的 row）
  // 對齊規格 §3.5「真刪品牌：未被引用 → 可真刪」
  const legacyRows = await prisma.nx01CarBrand.findMany({
    where: { tenantId, code: { in: LEGACY_CODES } },
    select: { id: true, code: true },
  });
  for (const lr of legacyRows) {
    // NX01-11 軸翻轉後 BrandCodeRule.carBrandId 已不存在（改 partBrandId、跟 carBrand 脫鉤）
    // 既有 referenced 檢查邏輯失效、改 try/delete + catch/停用 等價範式
    try {
      await prisma.nx01CarBrand.delete({ where: { id: lr.id } });
    } catch {
      // FK 撞到（被其他表引用）→ 改為停用、保留資料供業務人員手動處理
      await prisma.nx01CarBrand.update({
        where: { id: lr.id },
        data: { isActive: false, updatedBy: actorUserId },
      });
    }
  }

  // Upsert 4 主流品牌
  for (const r of rows) {
    await prisma.nx01CarBrand.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        nameEn: r.nameEn,
        countryId: deu.id,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      // tenant 可改 name / nameEn / sortNo / isActive、code 鎖（規格 §2.2）
      // 此處不覆蓋 tenant 已調整的 name / nameEn / sortNo（避免 seed re-run 蓋掉客制）
      update: {
        // 僅 ensure countryId = DEU（業界真相、不該被誤改 TWN）
        countryId: deu.id,
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_car_brand_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_car_brand), 0), 1), true)`,
  );

  console.log(
    `[TEMPLATE] applyCarBrand: cleaned ${legacyRows.length} legacy / upserted ${rows.length} system (tenant=${tenantId})`,
  );
}
