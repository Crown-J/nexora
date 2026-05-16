-- packages/db-core/prisma/migrations/20260516110000_nx03_impl_01_m3_disposal_doc_create/migration.sql
-- ============================================================================
-- Migration: nx03_impl_01_m3_disposal_doc_create
-- 建立日期：2026-05-16
-- 任務：TASK-NX03-IMPL-01 Phase 1 M3（報廢出庫表新建）
-- 對應 plan：docs/nx03/spec/impl/nx03-impl-01-plan.md §3 M3
-- 對應 overview：docs/nx03/spec/intent/nx03-overview.md §3.3 #8 報廢出庫 source=W
-- 對應拍板：Crown Q-B1=A 不簽核、倉管直接過帳
--
-- 範圍（A041 = 2 表 + 2 sequence + 2 gen_id function + FK）：
--   1. nx03_disposal       報廢單表頭（DSHD、status DRAFT/POSTED/VOIDED）
--   2. nx03_disposal_item  報廢單明細（含 disposalReason A/B/C/D + partVersionId M1 配套）
--
-- 設計要點：
--   - id 範式對齊 NX03 其他表：NX03DSHD0000001 / NX03DSIT0000001
--   - status enum: DRAFT / POSTED / VOIDED（對齊既有 Nx03Init / Nx03StockTake 慣例）
--   - disposalReason enum: A=損壞 / B=過期 / C=瑕疵 / D=其他（Hank 自決、待 Crown review 可調）
--   - partVersionId nullable VARCHAR(15) FK → nx01_part_version (M1 配套、Q-S1=B 漸進)
--   - DisposalItem.disposalId ON DELETE CASCADE（明細不可獨立存在）
--   - 其他 FK ON DELETE RESTRICT（不可刪 part/location/warehouse、避免歷史報廢單斷鏈）
--   - partVersionId FK ON DELETE SET NULL（版本被刪、保留歷史 row、snapshot 字段已備援）
--   - docNo unique（DS-YYYYMM-倉-NNNNN）
--
-- 風險：低（純新表、無破壞、無 backfill）
-- ============================================================================

-- ============================================================================
-- 1. sequence + gen_id function
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx03_disposal_id START 1;

CREATE OR REPLACE FUNCTION gen_nx03_disposal_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03DSHD' || LPAD(nextval('seq_nx03_disposal_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_disposal_item_id START 1;

CREATE OR REPLACE FUNCTION gen_nx03_disposal_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03DSIT' || LPAD(nextval('seq_nx03_disposal_item_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx03_disposal
-- ============================================================================

CREATE TABLE "nx03_disposal" (
    "id"            VARCHAR(15)   NOT NULL DEFAULT gen_nx03_disposal_id(),
    "tenant_id"     VARCHAR(15)   NOT NULL,
    "doc_no"        VARCHAR(30)   NOT NULL,
    "warehouse_id"  VARCHAR(15)   NOT NULL,
    "disposal_date" DATE          NOT NULL,
    "status"        VARCHAR(30)   NOT NULL DEFAULT 'DRAFT',
    "remark"        VARCHAR(200),
    "created_at"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"    VARCHAR(15)   NOT NULL,
    "updated_at"    TIMESTAMP(3)  NOT NULL,
    "updated_by"    VARCHAR(15)   NOT NULL,
    "posted_at"     TIMESTAMP(3),
    "posted_by"     VARCHAR(15),
    "voided_at"     TIMESTAMP(3),
    "voided_by"     VARCHAR(15),

    CONSTRAINT "nx03_disposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx03_disposal_doc_no_key" ON "nx03_disposal"("doc_no");

-- ============================================================================
-- 3. CREATE TABLE nx03_disposal_item
-- ============================================================================

CREATE TABLE "nx03_disposal_item" (
    "id"              VARCHAR(15)    NOT NULL DEFAULT gen_nx03_disposal_item_id(),
    "disposal_id"     VARCHAR(15)    NOT NULL,
    "line_no"         INTEGER        NOT NULL DEFAULT 1,
    "part_id"         VARCHAR(15)    NOT NULL,
    "part_no"         VARCHAR(50)    NOT NULL,
    "part_name"       VARCHAR(200)   NOT NULL,
    "part_version_id" VARCHAR(15),
    "location_id"     VARCHAR(15)    NOT NULL,
    "qty"             DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "unit_cost"       DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "total_cost"      DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "disposal_reason" VARCHAR(1)     NOT NULL,
    "disposal_remark" VARCHAR(200),
    "remark"          VARCHAR(200),
    "created_at"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"      VARCHAR(15)    NOT NULL,
    "updated_at"      TIMESTAMP(3)   NOT NULL,
    "updated_by"      VARCHAR(15)    NOT NULL,

    CONSTRAINT "nx03_disposal_item_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 4. FKs
-- ============================================================================

ALTER TABLE "nx03_disposal"
  ADD CONSTRAINT "nx03_disposal_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_disposal"
  ADD CONSTRAINT "nx03_disposal_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_disposal_item"
  ADD CONSTRAINT "nx03_disposal_item_disposal_id_fkey"
  FOREIGN KEY ("disposal_id") REFERENCES "nx03_disposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nx03_disposal_item"
  ADD CONSTRAINT "nx03_disposal_item_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_disposal_item"
  ADD CONSTRAINT "nx03_disposal_item_part_version_id_fkey"
  FOREIGN KEY ("part_version_id") REFERENCES "nx01_part_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx03_disposal_item"
  ADD CONSTRAINT "nx03_disposal_item_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 完成：報廢單 2 表 + sequence + FK 落地
-- 後續：service 層接 helper.applyQtyOutWithLedger(source=W、partVersionId 帶入)
-- ============================================================================
