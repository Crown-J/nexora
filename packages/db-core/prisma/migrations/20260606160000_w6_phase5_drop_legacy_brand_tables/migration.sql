-- packages/db-core/prisma/migrations/20260606160000_w6_phase5_drop_legacy_brand_tables/migration.sql
-- W6 [3-8] Phase 5 2026-06-06：DROP 舊 brand 欄位 + 舊表
--
-- 前置條件：
--   - W6-切換軌 CP1+CP2 完成（應用層讀寫全切 nx01_brand）
--   - Phase 4b：backend select 切 brand_id 完成
--   - Phase 4c：nx01_model.brand_id / nx01_brand_code_rule.brand_id SET NOT NULL（已 commit）
--   - phase4-pre DB 備份 ✓ + pre-w6-brand-merge DB 備份 ✓
--   - Verify ① PASS（isCar/isPart 分流正確）
--
-- 動作：
--   1. drop unique constraint 重建（brand_code_rule (tenantId, partBrandId, name) → (tenantId, brandId, name)）
--   2. drop 8 caller table FK constraint + drop 舊欄位（part_brand_id / car_brand_id）
--   3. drop nx01_part_brand + nx01_car_brand 表
--   4. drop 對應 sequence + gen_id() function（業界範式：seq 跟 table 同生命週期）
--
-- 不可逆：DROP TABLE 後資料消失（dev 範圍、production 上線前需重跑 seed）

-- =====================================================
-- 1) brand_code_rule unique constraint 重建（軸翻：partBrandId → brandId）
-- =====================================================
ALTER TABLE "nx01_brand_code_rule"
  DROP CONSTRAINT IF EXISTS "nx01_brand_code_rule_tenant_id_part_brand_id_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "nx01_brand_code_rule_tenant_id_brand_id_name_key"
  ON "nx01_brand_code_rule" ("tenant_id", "brand_id", "name");

-- =====================================================
-- 2) drop FK constraints（IF EXISTS 兼容、部分 W6 Phase 1 已 drop）
-- =====================================================
ALTER TABLE "nx01_part" DROP CONSTRAINT IF EXISTS "nx01_part_part_brand_id_fkey";
ALTER TABLE "nx01_part" DROP CONSTRAINT IF EXISTS "nx01_part_brand_id_fkey";
ALTER TABLE "nx01_part_oem_code" DROP CONSTRAINT IF EXISTS "nx01_part_oem_code_part_brand_id_fkey";
ALTER TABLE "nx01_brand_code_rule" DROP CONSTRAINT IF EXISTS "nx01_brand_code_rule_part_brand_id_fkey";
ALTER TABLE "nx01_engine" DROP CONSTRAINT IF EXISTS "nx01_engine_car_brand_id_fkey";
ALTER TABLE "nx01_transmission" DROP CONSTRAINT IF EXISTS "nx01_transmission_car_brand_id_fkey";
ALTER TABLE "nx01_model" DROP CONSTRAINT IF EXISTS "nx01_model_car_brand_id_fkey";
ALTER TABLE "nx09_vin_lookup" DROP CONSTRAINT IF EXISTS "nx09_vin_lookup_car_brand_id_fkey";
ALTER TABLE "nx03_st_item" DROP CONSTRAINT IF EXISTS "nx03_st_item_part_brand_id_fkey";

-- W6 Phase 1 已建的新 FK（brand_id_fkey）需重新加 part 主鍵 FK 以防 schema generator 漏建
-- （nx01_part schema 有 brandId FK relation、Phase 1 已建、此處 skip）

-- =====================================================
-- 3) drop legacy columns
-- =====================================================
ALTER TABLE "nx01_part" DROP COLUMN IF EXISTS "part_brand_id";
ALTER TABLE "nx01_part_oem_code" DROP COLUMN IF EXISTS "part_brand_id";
ALTER TABLE "nx01_brand_code_rule" DROP COLUMN IF EXISTS "part_brand_id";
ALTER TABLE "nx01_engine" DROP COLUMN IF EXISTS "car_brand_id";
ALTER TABLE "nx01_transmission" DROP COLUMN IF EXISTS "car_brand_id";
ALTER TABLE "nx01_model" DROP COLUMN IF EXISTS "car_brand_id";
ALTER TABLE "nx09_vin_lookup" DROP COLUMN IF EXISTS "car_brand_id";
ALTER TABLE "nx03_st_item" DROP COLUMN IF EXISTS "part_brand_id";

-- =====================================================
-- 4) drop legacy tables
-- =====================================================
DROP TABLE IF EXISTS "nx01_part_brand";
DROP TABLE IF EXISTS "nx01_car_brand";

-- =====================================================
-- 5) drop legacy sequences + gen_id() functions
-- =====================================================
DROP FUNCTION IF EXISTS gen_nx01_part_brand_id();
DROP FUNCTION IF EXISTS gen_nx01_car_brand_id();
DROP SEQUENCE IF EXISTS nx01_part_brand_id_seq;
DROP SEQUENCE IF EXISTS nx01_car_brand_id_seq;
