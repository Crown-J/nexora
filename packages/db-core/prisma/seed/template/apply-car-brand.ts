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
// 2026-06-15 W6 品牌合表後對齊：Nx01CarBrand 已合進 Nx01Brand（isCar/isPart 雙旗標）
//   - 車品牌 = Nx01Brand with isCar=true、零件品牌 = Nx01Brand with isPart=true
//   - 同 code 可雙開（VAG 同時是車品牌與零件品牌時、單筆 row 兩旗標都 true）
//   - upsert by tenantId_code（兩種 brand 共用 unique）

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

  // Cleanup：舊 5 個 VAG 子品牌（歷史 fact 校正、限該 tenant 之車品牌、且不誤刪兼用零件品牌）
  // 對齊規格 §3.5「真刪品牌：未被引用 → 可真刪」、合表後加判斷「isPart=true 則只收 isCar 不真刪」
  const legacyRows = await prisma.nx01Brand.findMany({
    where: { tenantId, code: { in: LEGACY_CODES }, isCar: true },
    select: { id: true, code: true, isPart: true },
  });
  for (const lr of legacyRows) {
    if (lr.isPart) {
      // 同時是零件品牌 → 不刪、只收 isCar 旗標
      await prisma.nx01Brand.update({
        where: { id: lr.id },
        data: { isCar: false, updatedBy: actorUserId },
      });
    } else {
      // 純車品牌、try delete、撞 FK（model / engine / transmission / vin_lookup 等）就停用
      try {
        await prisma.nx01Brand.delete({ where: { id: lr.id } });
      } catch {
        await prisma.nx01Brand.update({
          where: { id: lr.id },
          data: { isActive: false, updatedBy: actorUserId },
        });
      }
    }
  }

  // Upsert 4 主流品牌
  for (const r of rows) {
    await prisma.nx01Brand.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        nameEn: r.nameEn,
        countryId: deu.id,
        isCar: true,
        isPart: false,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      // tenant 可改 name / nameEn / sortNo / isActive、code 鎖（規格 §2.2）
      // 此處不覆蓋 tenant 已調整的 name / nameEn / sortNo（避免 seed re-run 蓋掉客制）
      update: {
        isCar: true,            // 確保標記、即使前次只當零件品牌
        countryId: deu.id,      // ensure countryId = DEU（業界真相、不該被誤改 TWN）
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_brand_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_brand), 0), 1), true)`,
  );

  console.log(
    `[TEMPLATE] applyCarBrand: cleaned ${legacyRows.length} legacy / upserted ${rows.length} system (tenant=${tenantId})`,
  );
}
