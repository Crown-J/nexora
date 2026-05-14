-- packages/db-core/prisma/migrations/20260513170000_nx01_13_model_create/migration.sql
-- ============================================================================
-- Migration: nx01_13_model_create
-- 建立日期：2026-05-13
-- 任務：TASK-NX01-13-IMPL commit 5（NX01-13 車型主檔從零建）
-- 對應 spec：docs/nx01/spec/intent/nx01-13-model.md v1.0
--
-- 範圍：擴充原則 #23 類型 1「加新東西」、全新表、空 seed
--
-- 變更：
--   1. sequence + gen_id function（NX01MODL）
--   2. CREATE TABLE nx01_model（tenant scoped、含 5 FK + 雙 INT 年份結構化）
--   3. indexes：(tenantId, code) unique + (tenantId, carBrandId) + (tenantId, modelYearFrom)
--   4. FKs：tenant + carBrand (NN) + engine/transmission/drivetrain/modelType (nullable)
--
-- 對齊 Crown 拍板：
--   Q1=A modelYearFrom/modelYearTo INT 結構化
--   Q2=A + code/name 雙欄位（業界縮寫 + 正式全名）
--   Q3=A carBrandId NN
--   Q4=A 空 seed（applyTemplateToTenant 不加 applyModel）
--   Q5=A 不接注音索引
-- ============================================================================

-- ============================================================================
-- 1. sequence + gen_id function
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx01_model_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_model_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01MODL' || LPAD(nextval('seq_nx01_model_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx01_model
-- ============================================================================

CREATE TABLE "nx01_model" (
    "id"                VARCHAR(15) NOT NULL DEFAULT gen_nx01_model_id(),
    "tenant_id"         VARCHAR(15) NOT NULL,
    "code"              VARCHAR(30) NOT NULL,
    "name"              VARCHAR(100) NOT NULL,
    "car_brand_id"      VARCHAR(15) NOT NULL,
    "model_year_from"   INTEGER NOT NULL,
    "model_year_to"     INTEGER,
    "engine_id"         VARCHAR(15),
    "transmission_id"   VARCHAR(15),
    "drivetrain_id"     VARCHAR(15),
    "model_type_id"     VARCHAR(15),
    "remark"            VARCHAR(200),
    "sort_no"           INTEGER NOT NULL DEFAULT 0,
    "is_active"         BOOLEAN NOT NULL DEFAULT true,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"        VARCHAR(15) NOT NULL,
    "updated_at"        TIMESTAMP(3) NOT NULL,
    "updated_by"        VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_model_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 3. indexes
-- ============================================================================

CREATE UNIQUE INDEX "nx01_model_tenant_id_code_key"
  ON "nx01_model"("tenant_id", "code");

-- 規格 §2.1：依車型品牌篩選用
CREATE INDEX "nx01_model_tenant_id_car_brand_id_idx"
  ON "nx01_model"("tenant_id", "car_brand_id");

-- 規格 §2.1：依年份範圍篩選用
CREATE INDEX "nx01_model_tenant_id_model_year_from_idx"
  ON "nx01_model"("tenant_id", "model_year_from");

-- ============================================================================
-- 4. FKs（5 FK + tenant、共 6 FK）
-- ============================================================================

ALTER TABLE "nx01_model"
  ADD CONSTRAINT "nx01_model_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_model"
  ADD CONSTRAINT "nx01_model_car_brand_id_fkey"
  FOREIGN KEY ("car_brand_id") REFERENCES "nx01_car_brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_model"
  ADD CONSTRAINT "nx01_model_engine_id_fkey"
  FOREIGN KEY ("engine_id") REFERENCES "nx01_engine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx01_model"
  ADD CONSTRAINT "nx01_model_transmission_id_fkey"
  FOREIGN KEY ("transmission_id") REFERENCES "nx01_transmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx01_model"
  ADD CONSTRAINT "nx01_model_drivetrain_id_fkey"
  FOREIGN KEY ("drivetrain_id") REFERENCES "nx01_drivetrain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx01_model"
  ADD CONSTRAINT "nx01_model_model_type_id_fkey"
  FOREIGN KEY ("model_type_id") REFERENCES "nx01_model_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 完成：NX01-13 車型主檔落地、空 seed、tenant 自加
-- 後續軌：
--   - commit 6：後端 controller + service + DTO + module
--   - commit 7：前端 UI + API client
--   - 未來：NX01-16 part_model schema 加 model_id FK
-- ============================================================================
