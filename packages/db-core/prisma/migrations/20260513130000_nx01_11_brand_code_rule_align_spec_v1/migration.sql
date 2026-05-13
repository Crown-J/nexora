-- packages/db-core/prisma/migrations/20260513130000_nx01_11_brand_code_rule_align_spec_v1/migration.sql
-- ============================================================================
-- Migration: nx01_11_brand_code_rule_align_spec_v1
-- 建立日期：2026-05-13
-- 任務：TASK-NX01-12-IMPL-v2 軌中 commit 2（NX01-11 schema 改 partBrandId → carBrandId）
-- 對應 spec：docs/nx01/spec/intent/nx01-11-brand-code-rule.md v1.0
--
-- 範圍：擴充原則 #23 類型 3「改既有語意」（業務模型重組）
--   既有 schema 無資料（已 grep verify、apply-brand-code-rule.ts 未存在、
--   Nx01Part 也未 seed 真實資料）、無 backfill 需求
--
-- 變更：
--   1. DROP FK part_brand_id → nx01_part_brand
--   2. RENAME column part_brand_id → car_brand_id
--   3. ADD FK car_brand_id → nx01_car_brand
--   4. ADD unique (tenant_id, car_brand_id)（規格 §3.1）
--   5. ALTER name VARCHAR(15) → VARCHAR(50)（規格 §3.2）
--   6. DROP columnar SEG 範式（seg1~5 / brand_sort / code_format）
--   7. ADD JSON SEG 範式 + 規格缺欄位（description / seg_count / seg_definitions /
--      separator / source_code_prefix / source_code_format / example_part_code）
--
-- 後續軌：
--   - commit 4：apply-brand-code-rule.ts seed 4 規則對應 4 car_brand
--   - A058：NX01-11 規則編輯頁 + 規則預覽 modal UI
-- ============================================================================

-- ============================================================================
-- 1. DROP 既有 FK part_brand_id → nx01_part_brand
-- ============================================================================

ALTER TABLE "nx01_brand_code_rule"
  DROP CONSTRAINT "nx01_brand_code_rule_part_brand_id_fkey";

-- ============================================================================
-- 2. RENAME column part_brand_id → car_brand_id
-- ============================================================================

ALTER TABLE "nx01_brand_code_rule"
  RENAME COLUMN "part_brand_id" TO "car_brand_id";

-- ============================================================================
-- 3. ADD 新 FK car_brand_id → nx01_car_brand
--    既有無資料、無 backfill 需求
-- ============================================================================

ALTER TABLE "nx01_brand_code_rule"
  ADD CONSTRAINT "nx01_brand_code_rule_car_brand_id_fkey"
  FOREIGN KEY ("car_brand_id") REFERENCES "nx01_car_brand"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 4. ADD unique (tenant_id, car_brand_id)（規格 §3.1）
-- ============================================================================

ALTER TABLE "nx01_brand_code_rule"
  ADD CONSTRAINT "nx01_brand_code_rule_tenant_id_car_brand_id_key"
  UNIQUE ("tenant_id", "car_brand_id");

-- ============================================================================
-- 5. ALTER name VARCHAR(15) → VARCHAR(50)（規格 §3.2）
-- ============================================================================

ALTER TABLE "nx01_brand_code_rule"
  ALTER COLUMN "name" TYPE VARCHAR(50);

-- ============================================================================
-- 6. DROP 既有 columnar SEG 範式（seg1~5 / brand_sort / code_format）
--    換 JSON 範式（Hank 自決對齊規格 §4.2）
-- ============================================================================

ALTER TABLE "nx01_brand_code_rule"
  DROP COLUMN "seg1",
  DROP COLUMN "seg2",
  DROP COLUMN "seg3",
  DROP COLUMN "seg4",
  DROP COLUMN "seg5",
  DROP COLUMN "brand_sort",
  DROP COLUMN "code_format";

-- ============================================================================
-- 7. ADD JSON SEG 範式 + 規格缺欄位（規格 §4.1）
-- ============================================================================

ALTER TABLE "nx01_brand_code_rule"
  ADD COLUMN "description" VARCHAR(200),
  ADD COLUMN "seg_count" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "seg_definitions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "separator" VARCHAR(1) NOT NULL DEFAULT '·',
  ADD COLUMN "source_code_prefix" VARCHAR(1) NOT NULL DEFAULT '#',
  ADD COLUMN "source_code_format" VARCHAR(30) NOT NULL DEFAULT 'BRAND3+COUNTRY3',
  ADD COLUMN "example_part_code" VARCHAR(100);

-- ============================================================================
-- 完成：NX01-11 schema 對齊規格 v1.0、business model FK 從 part_brand 翻轉為 car_brand
-- ============================================================================
