-- packages/db-core/prisma/migrations/20260516120000_nx03_impl_01_m4_conversion_doc_create/migration.sql
-- ============================================================================
-- Migration: nx03_impl_01_m4_conversion_doc_create
-- 建立日期：2026-05-16
-- 任務：TASK-NX03-IMPL-01 Phase 1 M4（重組 / 分解轉換表新建）
-- 對應 plan：docs/nx03/spec/impl/nx03-impl-01-plan.md §3 M4
-- 對應 overview：docs/nx03/spec/intent/nx03-overview.md §3.3 #9 重組 source=M / #10 分解 source=D
-- 對應拍板：Crown Q-M4-1=a 重組 output unitCost = Σ (input.unitCost × input.qty)（加權、service 層 impl）
--
-- 範圍（A041 = 3 表 + 3 sequence + 3 gen_id + 10 FK）：
--   1. nx03_conversion        轉換單表頭（CVHD、conversionType M/D + status DRAFT/POSTED/VOIDED）
--   2. nx03_conversion_input  輸入明細（CVIN、含 partVersionId M1 配套）
--   3. nx03_conversion_output 輸出明細（CVOT、含 partVersionId + costRatio 分解時人工指定）
--
-- 設計要點：
--   - id 範式：NX03CVHD / NX03CVIN / NX03CVOT（[NX03]+[4 chars]+[7 digit]、對齊既有 NX03 表）
--   - status enum: DRAFT / POSTED / VOIDED（對齊 Disposal）
--   - conversionType enum: M=merge 重組 / D=disassemble 分解（application 層校驗 row 數量 invariant：
--     M = N inputs + 1 output、D = 1 input + N outputs）
--   - costRatio Decimal(8,6) nullable：分解時可選、null=auto 按 part.priceA 比例、非 null=人工指定 0~1.0
--   - input/output.conversionId ON DELETE CASCADE（明細不可獨立存在）
--   - 其他 FK ON DELETE RESTRICT（part/location/warehouse 不可刪）
--   - partVersionId FK ON DELETE SET NULL（M1 範式對齊）
--   - docNo unique（CV-YYYYMM-倉-NNNNN）
--
-- 風險：低（純新表、無破壞、無 backfill）
-- 後續：service 層 impl 加權公式（重組 Q-M4-1=a / 分解 priceA ratio + costRatio override）
-- ============================================================================

-- ============================================================================
-- 1. sequence + gen_id function
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx03_conversion_id START 1;

CREATE OR REPLACE FUNCTION gen_nx03_conversion_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03CVHD' || LPAD(nextval('seq_nx03_conversion_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_conversion_input_id START 1;

CREATE OR REPLACE FUNCTION gen_nx03_conversion_input_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03CVIN' || LPAD(nextval('seq_nx03_conversion_input_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_conversion_output_id START 1;

CREATE OR REPLACE FUNCTION gen_nx03_conversion_output_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03CVOT' || LPAD(nextval('seq_nx03_conversion_output_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx03_conversion
-- ============================================================================

CREATE TABLE "nx03_conversion" (
    "id"              VARCHAR(15)   NOT NULL DEFAULT gen_nx03_conversion_id(),
    "tenant_id"       VARCHAR(15)   NOT NULL,
    "doc_no"          VARCHAR(30)   NOT NULL,
    "warehouse_id"    VARCHAR(15)   NOT NULL,
    "conversion_date" DATE          NOT NULL,
    "conversion_type" VARCHAR(1)    NOT NULL,
    "status"          VARCHAR(30)   NOT NULL DEFAULT 'DRAFT',
    "remark"          VARCHAR(200),
    "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"      VARCHAR(15)   NOT NULL,
    "updated_at"      TIMESTAMP(3)  NOT NULL,
    "updated_by"      VARCHAR(15)   NOT NULL,
    "posted_at"       TIMESTAMP(3),
    "posted_by"       VARCHAR(15),
    "voided_at"       TIMESTAMP(3),
    "voided_by"       VARCHAR(15),

    CONSTRAINT "nx03_conversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx03_conversion_doc_no_key" ON "nx03_conversion"("doc_no");

-- ============================================================================
-- 3. CREATE TABLE nx03_conversion_input
-- ============================================================================

CREATE TABLE "nx03_conversion_input" (
    "id"              VARCHAR(15)    NOT NULL DEFAULT gen_nx03_conversion_input_id(),
    "conversion_id"   VARCHAR(15)    NOT NULL,
    "line_no"         INTEGER        NOT NULL DEFAULT 1,
    "part_id"         VARCHAR(15)    NOT NULL,
    "part_no"         VARCHAR(50)    NOT NULL,
    "part_name"       VARCHAR(200)   NOT NULL,
    "part_version_id" VARCHAR(15),
    "location_id"     VARCHAR(15)    NOT NULL,
    "qty"             DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "unit_cost"       DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "total_cost"      DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "remark"          VARCHAR(200),
    "created_at"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"      VARCHAR(15)    NOT NULL,
    "updated_at"      TIMESTAMP(3)   NOT NULL,
    "updated_by"      VARCHAR(15)    NOT NULL,

    CONSTRAINT "nx03_conversion_input_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 4. CREATE TABLE nx03_conversion_output
-- ============================================================================

CREATE TABLE "nx03_conversion_output" (
    "id"              VARCHAR(15)    NOT NULL DEFAULT gen_nx03_conversion_output_id(),
    "conversion_id"   VARCHAR(15)    NOT NULL,
    "line_no"         INTEGER        NOT NULL DEFAULT 1,
    "part_id"         VARCHAR(15)    NOT NULL,
    "part_no"         VARCHAR(50)    NOT NULL,
    "part_name"       VARCHAR(200)   NOT NULL,
    "part_version_id" VARCHAR(15),
    "location_id"     VARCHAR(15)    NOT NULL,
    "qty"             DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "unit_cost"       DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "total_cost"      DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "cost_ratio"      DECIMAL(8, 6),
    "remark"          VARCHAR(200),
    "created_at"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"      VARCHAR(15)    NOT NULL,
    "updated_at"      TIMESTAMP(3)   NOT NULL,
    "updated_by"      VARCHAR(15)    NOT NULL,

    CONSTRAINT "nx03_conversion_output_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 5. FKs
-- ============================================================================

-- Header FKs
ALTER TABLE "nx03_conversion"
  ADD CONSTRAINT "nx03_conversion_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_conversion"
  ADD CONSTRAINT "nx03_conversion_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Input FKs
ALTER TABLE "nx03_conversion_input"
  ADD CONSTRAINT "nx03_conversion_input_conversion_id_fkey"
  FOREIGN KEY ("conversion_id") REFERENCES "nx03_conversion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nx03_conversion_input"
  ADD CONSTRAINT "nx03_conversion_input_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_conversion_input"
  ADD CONSTRAINT "nx03_conversion_input_part_version_id_fkey"
  FOREIGN KEY ("part_version_id") REFERENCES "nx01_part_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx03_conversion_input"
  ADD CONSTRAINT "nx03_conversion_input_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Output FKs
ALTER TABLE "nx03_conversion_output"
  ADD CONSTRAINT "nx03_conversion_output_conversion_id_fkey"
  FOREIGN KEY ("conversion_id") REFERENCES "nx03_conversion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nx03_conversion_output"
  ADD CONSTRAINT "nx03_conversion_output_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_conversion_output"
  ADD CONSTRAINT "nx03_conversion_output_part_version_id_fkey"
  FOREIGN KEY ("part_version_id") REFERENCES "nx01_part_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx03_conversion_output"
  ADD CONSTRAINT "nx03_conversion_output_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 完成：轉換單 3 表 + sequence + FK 落地
-- 後續：service impl 加權公式（Q-M4-1=a 重組）+ priceA ratio + costRatio override（分解）
-- ============================================================================
