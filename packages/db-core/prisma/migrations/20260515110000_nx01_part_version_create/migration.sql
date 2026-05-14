-- packages/db-core/prisma/migrations/20260515110000_nx01_part_version_create/migration.sql
-- ============================================================================
-- Migration: nx01_part_version_create
-- 建立日期：2026-05-15
-- 任務：TASK-NX01-17-IMPL commit 2（part_version 新建）
-- 對應 spec：docs/nx01/spec/intent/nx01-17-part-version-relation.md v1.0
--
-- 範圍：全 snapshot 範式（Crown Q1=A）、每次 part update 完整 copy 欄位
-- ============================================================================

-- ============================================================================
-- 1. sequence + gen_id function
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx01_part_version_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_part_version_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PAVE' || LPAD(nextval('seq_nx01_part_version_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx01_part_version
-- ============================================================================

CREATE TABLE "nx01_part_version" (
    "id"                       VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_version_id(),
    "tenant_id"                VARCHAR(15) NOT NULL,
    "part_id"                  VARCHAR(15) NOT NULL,
    "version_no"               INTEGER NOT NULL,
    "effective_from"           TIMESTAMP(3) NOT NULL,
    "effective_to"             TIMESTAMP(3),
    "code_snapshot"            VARCHAR(50) NOT NULL,
    "name_snapshot"            VARCHAR(200) NOT NULL,
    "part_brand_id_snapshot"   VARCHAR(15),
    "country_id_snapshot"      VARCHAR(15),
    "spec_snapshot"            VARCHAR(200),
    "price_a_snapshot"         DECIMAL(14, 4),
    "price_b_snapshot"         DECIMAL(14, 4),
    "price_c_snapshot"         DECIMAL(14, 4),
    "price_d_snapshot"         DECIMAL(14, 4),
    "change_reason"            VARCHAR(500),
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"               VARCHAR(15) NOT NULL,
    "updated_at"               TIMESTAMP(3) NOT NULL,
    "updated_by"               VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_part_version_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 3. indexes
-- ============================================================================

CREATE UNIQUE INDEX "nx01_part_version_tenant_id_part_id_version_no_key"
  ON "nx01_part_version"("tenant_id", "part_id", "version_no");

CREATE INDEX "nx01_part_version_tenant_id_part_id_idx"
  ON "nx01_part_version"("tenant_id", "part_id");

CREATE INDEX "nx01_part_version_tenant_id_effective_from_idx"
  ON "nx01_part_version"("tenant_id", "effective_from");

-- ============================================================================
-- 4. FKs
-- ============================================================================

ALTER TABLE "nx01_part_version"
  ADD CONSTRAINT "nx01_part_version_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_part_version"
  ADD CONSTRAINT "nx01_part_version_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 完成：part_version 落地、commit 5 接 part.service.update tx 同步寫 version
-- ============================================================================
