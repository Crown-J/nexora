-- TASK-NX03-STOCK-LITE-M1-SCHEMA
-- NEXORA LITE 階段 2 庫存模組 M1：schema 補欄位 + 1 新表
--
-- 對應 Crown 2026-05-28 拍板（PM Alex 階段 2 開工指令）：
--   A. 異常回報新表 nx03_issue_report（5 異常 × 5 處置分流、跨模組共用入口）
--   B. 庫位維度查詢純從 ledger aggregate、不改 balance schema（M2 service 落實、本軌無 schema 改動）
--   C. 自動補貨改走 nx98_task_pool（nx03_auto_replenish 標 @deprecated comment、不刪表、PLUS 後續再啟用）
--   D. 盤點差異核可：nx03_stock_take 補 small_tolerance_qty / approval_status（既有 approved_at / approved_by 沿用）
--   E. 盤點差異原因 enum：nx03_stock_take_item 補 variance_reason_code（S=被偷/M=算錯/B=破損/U=不明）
--   F. 預設庫位：nx03_part_stock_setting 補 default_location_id（進貨上架建議用）
--
-- ⚠️ M1 只做 schema + migration、service 邏輯 M2 處理
-- ⚠️ 全 NOT NULL DEFAULT 範式：既有資料零破壞（既有 stock_take/stock_take_item/part_stock_setting 新增欄位帶 default/nullable）
-- ⚠️ Railway production 維持落後 + 1 = 90 支（A077）、本 migration 仍 localhost-only
-- ⚠️ Nx03AutoReplenish 標 @deprecated 純 schema comment、DB 結構不動

-- =============================================================================
-- 1. ID 生成 function（對齊既有 gen_*_id() 範式：[NX03]+[4字]+[7位]）
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx03_issue_report_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_issue_report_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03ISRP' || LPAD(nextval('seq_nx03_issue_report_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =============================================================================
-- 2. CREATE TABLE nx03_issue_report
-- =============================================================================

CREATE TABLE "nx03_issue_report" (
    "id"                VARCHAR(15)  NOT NULL DEFAULT gen_nx03_issue_report_id(),
    "tenant_id"         VARCHAR(15)  NOT NULL,
    "doc_no"            VARCHAR(30)  NOT NULL,
    "report_date"       DATE         NOT NULL,
    "warehouse_id"      VARCHAR(15)  NOT NULL,
    "location_id"       VARCHAR(15),
    "part_id"           VARCHAR(15)  NOT NULL,
    "part_no"           VARCHAR(50)  NOT NULL,
    "part_name"         VARCHAR(200) NOT NULL,
    "part_version_id"   VARCHAR(15),
    "qty"               DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "issue_type"        VARCHAR(1)   NOT NULL,
    "disposition_type"  VARCHAR(1)   NOT NULL DEFAULT 'N',
    "related_doc_id"    VARCHAR(15),
    "source_module"     VARCHAR(10),
    "source_doc_type"   VARCHAR(20),
    "source_doc_id"     VARCHAR(15),
    "status"            VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
    "description"       VARCHAR(500),
    "photo_url"         VARCHAR(500),
    "closed_at"         TIMESTAMP(3),
    "closed_by"         VARCHAR(15),
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"        VARCHAR(15)  NOT NULL,
    "updated_at"        TIMESTAMP(3) NOT NULL,
    "updated_by"        VARCHAR(15)  NOT NULL,

    CONSTRAINT "nx03_issue_report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx03_issue_report_doc_no_key" ON "nx03_issue_report"("doc_no");

ALTER TABLE "nx03_issue_report"
    ADD CONSTRAINT "nx03_issue_report_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_issue_report"
    ADD CONSTRAINT "nx03_issue_report_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_issue_report"
    ADD CONSTRAINT "nx03_issue_report_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_issue_report"
    ADD CONSTRAINT "nx03_issue_report_part_id_fkey"
    FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_issue_report"
    ADD CONSTRAINT "nx03_issue_report_part_version_id_fkey"
    FOREIGN KEY ("part_version_id") REFERENCES "nx01_part_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- 3. ALTER nx03_part_stock_setting：補 default_location_id
-- =============================================================================

ALTER TABLE "nx03_part_stock_setting"
    ADD COLUMN "default_location_id" VARCHAR(15);

ALTER TABLE "nx03_part_stock_setting"
    ADD CONSTRAINT "nx03_part_stock_setting_default_location_id_fkey"
    FOREIGN KEY ("default_location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- 4. ALTER nx03_stock_take：補 small_tolerance_qty / approval_status
-- =============================================================================

ALTER TABLE "nx03_stock_take"
    ADD COLUMN "small_tolerance_qty" DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE "nx03_stock_take"
    ADD COLUMN "approval_status" VARCHAR(1) NOT NULL DEFAULT 'N';

-- =============================================================================
-- 5. ALTER nx03_stock_take_item：補 variance_reason_code
-- =============================================================================

ALTER TABLE "nx03_stock_take_item"
    ADD COLUMN "variance_reason_code" VARCHAR(1);
