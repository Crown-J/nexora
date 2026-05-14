-- packages/db-core/prisma/migrations/20260513160000_nx01_15_classification_create_3_tables/migration.sql
-- ============================================================================
-- Migration: nx01_15_classification_create_3_tables
-- 建立日期：2026-05-13
-- 任務：TASK-NX01-13-IMPL commit 1（NX01-15 三表 schema、本軌前置）
-- 對應 spec：docs/nx01/spec/intent/nx01-15-vehicle-classification.md v1.0 §4
--
-- 範圍（#22 鐵律觸發、本軌擴張）：
--   NX01-15 三表規格 v1.0 但 impl 未落地、Hank 寫 NX01-13 必先補
--
-- 變更：
--   1. 3 sequences + 3 gen_id functions
--      (TRMS / DTRN / MDTP)
--   2. CREATE TABLE × 3
--      nx01_transmission（A 主檔複雜度、含 transmissionType SmallInt enum + gearCount + carBrandId）
--      nx01_drivetrain（B 型錄、6 業務欄位）
--      nx01_model_type（B 型錄、6 業務欄位）
--   3. unique index (tenantId, code) × 3
--   4. FKs（tenant × 3 + carBrand × 1 for transmission）
--
-- 對齊 Crown 拍板：tenant scoped + 系統 seed 最小骨架（commit 2 落地）
-- ============================================================================

-- ============================================================================
-- 1. sequences + gen_id functions
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx01_transmission_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_transmission_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01TRMS' || LPAD(nextval('seq_nx01_transmission_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_drivetrain_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_drivetrain_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01DTRN' || LPAD(nextval('seq_nx01_drivetrain_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_model_type_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_model_type_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01MDTP' || LPAD(nextval('seq_nx01_model_type_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx01_transmission
-- ============================================================================

CREATE TABLE "nx01_transmission" (
    "id"                 VARCHAR(15) NOT NULL DEFAULT gen_nx01_transmission_id(),
    "tenant_id"          VARCHAR(15) NOT NULL,
    "code"               VARCHAR(30) NOT NULL,
    "name"               VARCHAR(100) NOT NULL,
    "name_en"            VARCHAR(100),
    "transmission_type"  SMALLINT NOT NULL,
    "gear_count"         INTEGER,
    "car_brand_id"       VARCHAR(15),
    "remark"             VARCHAR(200),
    "sort_no"            INTEGER NOT NULL DEFAULT 0,
    "is_active"          BOOLEAN NOT NULL DEFAULT true,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"         VARCHAR(15) NOT NULL,
    "updated_at"         TIMESTAMP(3) NOT NULL,
    "updated_by"         VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_transmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx01_transmission_tenant_id_code_key"
  ON "nx01_transmission"("tenant_id", "code");

-- ============================================================================
-- 3. CREATE TABLE nx01_drivetrain
-- ============================================================================

CREATE TABLE "nx01_drivetrain" (
    "id"           VARCHAR(15) NOT NULL DEFAULT gen_nx01_drivetrain_id(),
    "tenant_id"    VARCHAR(15) NOT NULL,
    "code"         VARCHAR(30) NOT NULL,
    "name"         VARCHAR(100) NOT NULL,
    "name_en"      VARCHAR(100),
    "remark"       VARCHAR(200),
    "sort_no"      INTEGER NOT NULL DEFAULT 0,
    "is_active"    BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"   VARCHAR(15) NOT NULL,
    "updated_at"   TIMESTAMP(3) NOT NULL,
    "updated_by"   VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_drivetrain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx01_drivetrain_tenant_id_code_key"
  ON "nx01_drivetrain"("tenant_id", "code");

-- ============================================================================
-- 4. CREATE TABLE nx01_model_type
-- ============================================================================

CREATE TABLE "nx01_model_type" (
    "id"           VARCHAR(15) NOT NULL DEFAULT gen_nx01_model_type_id(),
    "tenant_id"    VARCHAR(15) NOT NULL,
    "code"         VARCHAR(30) NOT NULL,
    "name"         VARCHAR(100) NOT NULL,
    "name_en"      VARCHAR(100),
    "remark"       VARCHAR(200),
    "sort_no"      INTEGER NOT NULL DEFAULT 0,
    "is_active"    BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"   VARCHAR(15) NOT NULL,
    "updated_at"   TIMESTAMP(3) NOT NULL,
    "updated_by"   VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_model_type_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx01_model_type_tenant_id_code_key"
  ON "nx01_model_type"("tenant_id", "code");

-- ============================================================================
-- 5. FKs
-- ============================================================================

ALTER TABLE "nx01_transmission"
  ADD CONSTRAINT "nx01_transmission_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_transmission"
  ADD CONSTRAINT "nx01_transmission_car_brand_id_fkey"
  FOREIGN KEY ("car_brand_id") REFERENCES "nx01_car_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx01_drivetrain"
  ADD CONSTRAINT "nx01_drivetrain_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_model_type"
  ADD CONSTRAINT "nx01_model_type_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 完成：NX01-15 三表 schema 落地、commit 2 補 seed apply 最小骨架
-- ============================================================================
