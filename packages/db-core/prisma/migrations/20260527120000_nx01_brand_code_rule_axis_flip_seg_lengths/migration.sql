-- ============================================================
-- A. 廠牌料號規則重做：軸翻轉 carBrandId → partBrandId、拿掉 JSON 系列、改 SEG1~5 字數
--   · carBrandId → partBrandId（對應「零件品牌」，軸翻轉）
--   · 拿掉 seg_count / seg_definitions(JSON) / source_code_prefix / source_code_format / example_part_code
--   · 新增 seg1_length~seg5_length；unique 改 [tenant_id, part_brand_id, name]（同品牌可多規則）
--   · part.code_rule_id 改可空（編碼規則改選填）
--   · 既有規則為可重生 seed/template 資料、軸翻轉後舊 car_brand_id 無法對應 part_brand → 清空重建
-- 全程冪等（IF EXISTS / IF NOT EXISTS），可安全重跑。
-- ============================================================

-- 1) part.code_rule_id 改可空
ALTER TABLE "nx01_part" DROP CONSTRAINT IF EXISTS "nx01_part_code_rule_id_fkey";
ALTER TABLE "nx01_part" ALTER COLUMN "code_rule_id" DROP NOT NULL;

-- 2) 解除零件對舊規則連結、清空舊規則
UPDATE "nx01_part" SET "code_rule_id" = NULL WHERE "code_rule_id" IS NOT NULL;
DELETE FROM "nx01_brand_code_rule";

-- 3) brand_code_rule 結構轉換（表已清空）
ALTER TABLE "nx01_brand_code_rule" DROP CONSTRAINT IF EXISTS "nx01_brand_code_rule_car_brand_id_fkey";
ALTER TABLE "nx01_brand_code_rule" DROP CONSTRAINT IF EXISTS "nx01_brand_code_rule_tenant_id_car_brand_id_key";
ALTER TABLE "nx01_brand_code_rule"
  DROP COLUMN IF EXISTS "car_brand_id",
  DROP COLUMN IF EXISTS "example_part_code",
  DROP COLUMN IF EXISTS "seg_count",
  DROP COLUMN IF EXISTS "seg_definitions",
  DROP COLUMN IF EXISTS "source_code_format",
  DROP COLUMN IF EXISTS "source_code_prefix",
  ADD COLUMN IF NOT EXISTS "part_brand_id" VARCHAR(15) NOT NULL,
  ADD COLUMN IF NOT EXISTS "seg1_length" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "seg2_length" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "seg3_length" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "seg4_length" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "seg5_length" INTEGER NOT NULL DEFAULT 0;

-- 4) 新 unique + 重建 part FK（part_brand_id 採 scalar、不建 FK、對齊既有 audit 欄位慣例避免 drift）
CREATE UNIQUE INDEX IF NOT EXISTS "nx01_brand_code_rule_tenant_id_part_brand_id_name_key" ON "nx01_brand_code_rule"("tenant_id", "part_brand_id", "name");
ALTER TABLE "nx01_part" DROP CONSTRAINT IF EXISTS "nx01_part_code_rule_id_fkey";
ALTER TABLE "nx01_part" ADD CONSTRAINT "nx01_part_code_rule_id_fkey" FOREIGN KEY ("code_rule_id") REFERENCES "nx01_brand_code_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
