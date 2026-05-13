-- packages/db-core/prisma/migrations/20260513150000_nx01_14_engine_create/migration.sql
-- ============================================================================
-- Migration: nx01_14_engine_create
-- 建立日期：2026-05-13
-- 任務：TASK-NX01-14-IMPL commit 1（NX01-14 引擎主檔從零建）
-- 對應 spec：docs/nx01/spec/intent/nx01-14-engine.md v1.0
--
-- 範圍：擴充原則 #23 類型 1「加新東西」、全新表、無 backfill 需求
--
-- 變更：
--   1. sequence + gen_id function（NX01ENGN）
--   2. CREATE TABLE nx01_engine（tenant scoped、含 fuelType / aspirationType SmallInt enum）
--   3. indexes：(tenantId, code) unique + (tenantId, fuelType)
--   4. FK：tenant_id → nx99_tenant + car_brand_id → nx01_car_brand (nullable)
--
-- 對齊 Crown 拍板：
--   Q1=C fuelType enum 4 種（1=汽油 / 2=柴油 / 3=Hybrid / 4=EV）
--   Q2=A aspirationType enum 4 種（1=NA / 2=TC / 3=SC / 4=TC+SC）
--   Q3=A carBrandId nullable
--   Q4=A 空 seed（apply-template 不加 applyEngine、tenant 自加）
--   業界 muscle memory：EV 引擎 displacementCc / cylinderConfig / aspirationType 三欄保留 nullable
-- ============================================================================

-- ============================================================================
-- 1. sequence + gen_id function（NX01ENGN）
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx01_engine_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_engine_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01ENGN' || LPAD(nextval('seq_nx01_engine_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx01_engine
-- ============================================================================

CREATE TABLE "nx01_engine" (
    "id"               VARCHAR(15) NOT NULL DEFAULT gen_nx01_engine_id(),
    "tenant_id"        VARCHAR(15) NOT NULL,
    "code"             VARCHAR(30) NOT NULL,
    "name"             VARCHAR(100) NOT NULL,
    "displacement_cc"  INTEGER,
    "cylinder_config"  VARCHAR(20),
    "fuel_type"        SMALLINT NOT NULL DEFAULT 1,
    "aspiration_type"  SMALLINT DEFAULT 1,
    "car_brand_id"     VARCHAR(15),
    "remark"           VARCHAR(200),
    "sort_no"          INTEGER NOT NULL DEFAULT 0,
    "is_active"        BOOLEAN NOT NULL DEFAULT true,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"       VARCHAR(15) NOT NULL,
    "updated_at"       TIMESTAMP(3) NOT NULL,
    "updated_by"       VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_engine_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 3. indexes
-- ============================================================================

-- 規格 §3.1：tenant 內 code unique
CREATE UNIQUE INDEX "nx01_engine_tenant_id_code_key"
  ON "nx01_engine"("tenant_id", "code");

-- 規格 §2.1：UI 依 fuelType 篩選用
CREATE INDEX "nx01_engine_tenant_id_fuel_type_idx"
  ON "nx01_engine"("tenant_id", "fuel_type");

-- ============================================================================
-- 4. FKs
-- ============================================================================

ALTER TABLE "nx01_engine"
  ADD CONSTRAINT "nx01_engine_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_engine"
  ADD CONSTRAINT "nx01_engine_car_brand_id_fkey"
  FOREIGN KEY ("car_brand_id") REFERENCES "nx01_car_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 完成：NX01-14 引擎主檔落地、空表進、tenant 自加
-- 後續軌：
--   - commit 2：後端 controller + service + DTO + module
--   - commit 3：前端 UI + API client
--   - 未來：NX01-13 model schema 加 engine_id FK（nullable、跨軌）
-- ============================================================================
