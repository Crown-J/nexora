-- packages/db-core/prisma/migrations/20260606050000_w6_brand_merge_phase1/migration.sql
-- W6 [3-8] 2026-06-06 品牌合併 Phase 1（NX-MANUAL-02 v2.0 §3.8、Alex+總經理 拍板）
--
-- 目標：合 Nx01CarBrand + Nx01PartBrand → 單一 Nx01Brand（isCar/isPart 雙開關）
--   - 同 code 衝突走方案 A：合併成一筆、兩開關都開（汽車+零件）
--   - is_oem 不搬到品牌層、改由零件 part.isOem 決定（部品層級屬性）
--   - 8 個 FK 重綁：Engine / Transmission / Model / VinLookup / Part / PartOemCode / StItem / BrandCodeRule
--
-- 本 Phase 範圍（additive、保留舊欄位/舊表）：
--   1. CREATE Nx01Brand 表 + sequence + gen function
--   2. 8 個表加 brand_id 欄位（all nullable、本軌不 SET NOT NULL）
--   3. 從 nx01_part_brand backfill brand 表（isPart=true / isCar=false）
--   4. 從 nx01_car_brand backfill brand 表（isCar=true、同 code 衝突 UPDATE 兩開關都開）
--   5. 8 個表 backfill brand_id（依舊 partBrandId / carBrandId 對應）
--
-- 後續軌：
--   - service / DTO / frontend 改用 brand_id（Phase 2）
--   - SET NOT NULL on model.brand_id / brand_code_rule.brand_id（Phase 3）
--   - DROP 舊 nx01_part_brand / nx01_car_brand 表 + 舊欄位 part_brand_id / car_brand_id（Phase 4）
--
-- 全程冪等（IF NOT EXISTS / NOT EXISTS）可安全重跑、dev DB 端、Railway 0 動。
-- Backup: dev-backups/pre-w6-brand-merge_*.sql

-- ============================================================
-- 1. Nx01Brand sequence + gen function
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_brand_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_brand_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01BRND' || LPAD(nextval('seq_nx01_brand_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================
-- 2. 建 nx01_brand 表
-- ============================================================
CREATE TABLE IF NOT EXISTS "nx01_brand" (
    "id"         VARCHAR(15) NOT NULL DEFAULT gen_nx01_brand_id(),
    "tenant_id"  VARCHAR(15) NOT NULL,
    "code"       VARCHAR(30) NOT NULL,
    "name"       VARCHAR(100) NOT NULL,
    "name_en"    VARCHAR(100),
    "country_id" VARCHAR(15),
    "logo_url"   VARCHAR(500),
    "is_car"     BOOLEAN NOT NULL DEFAULT false,
    "is_part"    BOOLEAN NOT NULL DEFAULT false,
    "remark"     VARCHAR(200),
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "sort_no"    INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx01_brand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_brand_tenant_id_code_key"
  ON "nx01_brand"("tenant_id", "code");

ALTER TABLE "nx01_brand" DROP CONSTRAINT IF EXISTS "nx01_brand_tenant_id_fkey";
ALTER TABLE "nx01_brand"
  ADD CONSTRAINT "nx01_brand_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_brand" DROP CONSTRAINT IF EXISTS "nx01_brand_country_id_fkey";
ALTER TABLE "nx01_brand"
  ADD CONSTRAINT "nx01_brand_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "nx01_country"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 3. backfill 從 nx01_part_brand → nx01_brand（isPart=true）
-- ============================================================
INSERT INTO "nx01_brand" (
  id, tenant_id, code, name, country_id, is_part, is_car, remark, is_active, sort_no,
  created_at, created_by, updated_at, updated_by
)
SELECT
  gen_nx01_brand_id(),
  pb.tenant_id,
  pb.code,
  pb.name,
  pb.country_id,
  true,   -- is_part = true（來源是零件品牌）
  false,  -- is_car = false（後續可能 UPDATE 開、合併衝突時）
  pb.remark,
  pb.is_active,
  pb.sort_no,
  pb.created_at,
  pb.created_by,
  CURRENT_TIMESTAMP,
  pb.updated_by
FROM "nx01_part_brand" pb
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ============================================================
-- 4. backfill 從 nx01_car_brand → nx01_brand（isCar=true、同 code 衝突合併）
-- ============================================================
-- 4a. 新 code（不存在於 brand 表的）INSERT、is_car=true / is_part=false
INSERT INTO "nx01_brand" (
  id, tenant_id, code, name, name_en, country_id, logo_url, is_part, is_car, remark, is_active, sort_no,
  created_at, created_by, updated_at, updated_by
)
SELECT
  gen_nx01_brand_id(),
  cb.tenant_id,
  cb.code,
  cb.name,
  cb.name_en,
  cb.country_id,
  cb.logo_url,
  false,  -- is_part = false
  true,   -- is_car = true
  cb.remark,
  cb.is_active,
  cb.sort_no,
  cb.created_at,
  cb.created_by,
  CURRENT_TIMESTAMP,
  cb.updated_by
FROM "nx01_car_brand" cb
ON CONFLICT (tenant_id, code) DO NOTHING;

-- 4b. 既有 brand row（同 code 也是 partBrand 的）UPDATE is_car=true、合併 name_en + logo_url
UPDATE "nx01_brand" b
SET
  is_car = true,
  name_en = COALESCE(b.name_en, cb.name_en),
  logo_url = COALESCE(b.logo_url, cb.logo_url),
  updated_at = CURRENT_TIMESTAMP
FROM "nx01_car_brand" cb
WHERE b.tenant_id = cb.tenant_id
  AND b.code = cb.code
  AND b.is_car = false;  -- 只 update 沒標 is_car 的、避免重複跑時 update_at 一直變

-- ============================================================
-- 5a. Nx01Part: 加 brand_id 欄位 + backfill
-- ============================================================
ALTER TABLE "nx01_part" ADD COLUMN IF NOT EXISTS "brand_id" VARCHAR(15);
UPDATE "nx01_part" p
SET brand_id = b.id
FROM "nx01_part_brand" pb,
     "nx01_brand" b
WHERE p.part_brand_id = pb.id
  AND b.tenant_id = pb.tenant_id
  AND b.code = pb.code
  AND p.brand_id IS NULL;
ALTER TABLE "nx01_part" DROP CONSTRAINT IF EXISTS "nx01_part_brand_id_fkey";
ALTER TABLE "nx01_part"
  ADD CONSTRAINT "nx01_part_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "nx01_brand"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "nx01_part_tenant_id_brand_id_idx"
  ON "nx01_part"("tenant_id", "brand_id");

-- 5b. Nx01PartOemCode: 加 brand_id + backfill
ALTER TABLE "nx01_part_oem_code" ADD COLUMN IF NOT EXISTS "brand_id" VARCHAR(15);
UPDATE "nx01_part_oem_code" oc
SET brand_id = b.id
FROM "nx01_part_brand" pb,
     "nx01_brand" b
WHERE oc.part_brand_id = pb.id
  AND b.tenant_id = pb.tenant_id
  AND b.code = pb.code
  AND oc.brand_id IS NULL;
ALTER TABLE "nx01_part_oem_code" DROP CONSTRAINT IF EXISTS "nx01_part_oem_code_brand_id_fkey";
ALTER TABLE "nx01_part_oem_code"
  ADD CONSTRAINT "nx01_part_oem_code_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "nx01_brand"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5c. Nx03StItem: 加 brand_id + backfill
ALTER TABLE "nx03_st_item" ADD COLUMN IF NOT EXISTS "brand_id" VARCHAR(15);
UPDATE "nx03_st_item" si
SET brand_id = b.id
FROM "nx01_part_brand" pb,
     "nx01_brand" b
WHERE si.part_brand_id = pb.id
  AND b.tenant_id = pb.tenant_id
  AND b.code = pb.code
  AND si.brand_id IS NULL;
ALTER TABLE "nx03_st_item" DROP CONSTRAINT IF EXISTS "nx03_st_item_brand_id_fkey";
ALTER TABLE "nx03_st_item"
  ADD CONSTRAINT "nx03_st_item_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "nx01_brand"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5d. Nx01BrandCodeRule: 加 brand_id + backfill（partBrandId 是 NOT NULL、brand_id 先 nullable）
ALTER TABLE "nx01_brand_code_rule" ADD COLUMN IF NOT EXISTS "brand_id" VARCHAR(15);
UPDATE "nx01_brand_code_rule" bcr
SET brand_id = b.id
FROM "nx01_part_brand" pb,
     "nx01_brand" b
WHERE bcr.part_brand_id = pb.id
  AND b.tenant_id = pb.tenant_id
  AND b.code = pb.code
  AND bcr.brand_id IS NULL;
ALTER TABLE "nx01_brand_code_rule" DROP CONSTRAINT IF EXISTS "nx01_brand_code_rule_brand_id_fkey";
ALTER TABLE "nx01_brand_code_rule"
  ADD CONSTRAINT "nx01_brand_code_rule_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "nx01_brand"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5e. Nx01Engine: 加 brand_id + backfill
ALTER TABLE "nx01_engine" ADD COLUMN IF NOT EXISTS "brand_id" VARCHAR(15);
UPDATE "nx01_engine" e
SET brand_id = b.id
FROM "nx01_car_brand" cb,
     "nx01_brand" b
WHERE e.car_brand_id = cb.id
  AND b.tenant_id = cb.tenant_id
  AND b.code = cb.code
  AND e.brand_id IS NULL;
ALTER TABLE "nx01_engine" DROP CONSTRAINT IF EXISTS "nx01_engine_brand_id_fkey";
ALTER TABLE "nx01_engine"
  ADD CONSTRAINT "nx01_engine_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "nx01_brand"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5f. Nx01Transmission: 加 brand_id + backfill
ALTER TABLE "nx01_transmission" ADD COLUMN IF NOT EXISTS "brand_id" VARCHAR(15);
UPDATE "nx01_transmission" t
SET brand_id = b.id
FROM "nx01_car_brand" cb,
     "nx01_brand" b
WHERE t.car_brand_id = cb.id
  AND b.tenant_id = cb.tenant_id
  AND b.code = cb.code
  AND t.brand_id IS NULL;
ALTER TABLE "nx01_transmission" DROP CONSTRAINT IF EXISTS "nx01_transmission_brand_id_fkey";
ALTER TABLE "nx01_transmission"
  ADD CONSTRAINT "nx01_transmission_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "nx01_brand"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5g. Nx01Model: 加 brand_id + backfill（carBrandId 是 NOT NULL、brand_id 先 nullable）
ALTER TABLE "nx01_model" ADD COLUMN IF NOT EXISTS "brand_id" VARCHAR(15);
UPDATE "nx01_model" m
SET brand_id = b.id
FROM "nx01_car_brand" cb,
     "nx01_brand" b
WHERE m.car_brand_id = cb.id
  AND b.tenant_id = cb.tenant_id
  AND b.code = cb.code
  AND m.brand_id IS NULL;
ALTER TABLE "nx01_model" DROP CONSTRAINT IF EXISTS "nx01_model_brand_id_fkey";
ALTER TABLE "nx01_model"
  ADD CONSTRAINT "nx01_model_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "nx01_brand"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "nx01_model_tenant_id_brand_id_idx"
  ON "nx01_model"("tenant_id", "brand_id");

-- 5h. Nx09VinLookup: 加 brand_id + backfill
ALTER TABLE "nx09_vin_lookup" ADD COLUMN IF NOT EXISTS "brand_id" VARCHAR(15);
UPDATE "nx09_vin_lookup" vl
SET brand_id = b.id
FROM "nx01_car_brand" cb,
     "nx01_brand" b
WHERE vl.car_brand_id = cb.id
  AND b.tenant_id = cb.tenant_id
  AND b.code = cb.code
  AND vl.brand_id IS NULL;
ALTER TABLE "nx09_vin_lookup" DROP CONSTRAINT IF EXISTS "nx09_vin_lookup_brand_id_fkey";
ALTER TABLE "nx09_vin_lookup"
  ADD CONSTRAINT "nx09_vin_lookup_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "nx01_brand"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
