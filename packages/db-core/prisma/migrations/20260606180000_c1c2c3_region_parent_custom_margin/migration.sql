-- packages/db-core/prisma/migrations/20260606180000_c1c2c3_region_parent_custom_margin/migration.sql
-- 02 對齊第二批 C 軌 CP1 2026-06-06：客戶補 3 個結構欄位（NX-MANUAL-02 v2.0 §補）
--
-- C1 nx01_region 新主檔（地區下拉、tenant 內、不入 partner code 編號）
-- C2 nx01_partner.parent_partner_id  總公司關聯（self-FK、連鎖母子）
-- C3 nx01_partner.custom_margin_pct  個別客戶毛利率覆寫（覆寫 customer_grade.margin_pct）
--    註：Alex 原文寫 customDiscountPercent、實作對齊 schema 既有 customer_grade.margin_pct
--    範式（覆寫上限保底毛利率、不是另一維度折扣率）；UI 顯示文案另議。
--
-- 全 nullable additive、ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS 冪等。

-- ============================================================
-- 1. C1 nx01_region 新表 + sequence + gen_id function
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_region_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_region_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01REGN' || LPAD(nextval('seq_nx01_region_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx01_region" (
  "id"          VARCHAR(15) NOT NULL DEFAULT gen_nx01_region_id(),
  "tenant_id"   VARCHAR(15) NOT NULL,
  "code"        VARCHAR(20) NOT NULL,
  "name"        VARCHAR(50) NOT NULL,
  "sort_no"     INTEGER NOT NULL DEFAULT 0,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"  VARCHAR(15) NOT NULL,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"  VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_region_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_region_tenant_id_code_key"
  ON "nx01_region" ("tenant_id", "code");

ALTER TABLE "nx01_region"
  ADD CONSTRAINT "nx01_region_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ============================================================
-- 2. partner 加 3 個欄位
-- ============================================================
ALTER TABLE "nx01_partner"
  ADD COLUMN IF NOT EXISTS "region_id"          VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "parent_partner_id"  VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "custom_margin_pct"  DECIMAL(5, 2);

-- FK to region（SET NULL on delete = region 刪掉、partner.regionId 自動清空、不擋）
ALTER TABLE "nx01_partner"
  ADD CONSTRAINT "nx01_partner_region_id_fkey"
  FOREIGN KEY ("region_id") REFERENCES "nx01_region" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- self-FK to partner（SET NULL on delete = 總公司刪掉、子公司 parentId 自動清空、不刪子）
ALTER TABLE "nx01_partner"
  ADD CONSTRAINT "nx01_partner_parent_partner_id_fkey"
  FOREIGN KEY ("parent_partner_id") REFERENCES "nx01_partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
