-- packages/db-core/prisma/migrations/20260520300000_nx09_impl_01_m1_system_manual_table/migration.sql
-- NX09-IMPL-01 Phase 1 M1：SystemManual 系統操作手冊新表（Crown Q5=b ⭐ 業界 ERP 標配）
-- 對齊：overview v1.0 §4 + audit-01 §6.2 + plan §3 M1
-- 性質：純新表、0 既有 ALTER、0 backfill 衝突
-- featureKey 命名規範：模組.功能.動作（如 nx04.so.create）

CREATE OR REPLACE FUNCTION gen_nx09_system_manual_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq FROM nx09_system_manual;
  RETURN 'NX09SYMA' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE "nx09_system_manual" (
  "id"           VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx09_system_manual_id(),
  "tenant_id"    VARCHAR(15)  NOT NULL,
  "feature_key"  VARCHAR(50)  NOT NULL,
  "title"        VARCHAR(200) NOT NULL,
  "content"      TEXT,
  "steps"        TEXT,
  "screenshots"  TEXT,
  "category"     VARCHAR(30)  NOT NULL DEFAULT 'GENERAL',
  "version"      VARCHAR(10)  NOT NULL DEFAULT '1.0',
  "is_active"    BOOLEAN      NOT NULL DEFAULT true,
  "remark"       VARCHAR(500),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"   VARCHAR(15)  NOT NULL,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  "updated_by"   VARCHAR(15)  NOT NULL,
  CONSTRAINT "nx09_system_manual_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id")
);

CREATE UNIQUE INDEX "nx09_system_manual_feature_key_key" ON "nx09_system_manual" ("feature_key");
CREATE INDEX "nx09_system_manual_tenant_idx"   ON "nx09_system_manual" ("tenant_id");
CREATE INDEX "nx09_system_manual_category_idx" ON "nx09_system_manual" ("tenant_id", "category");

COMMENT ON TABLE  "nx09_system_manual" IS 'NX09 系統操作手冊（NEXORA 自帶說明、業界 ERP 標配 SAP/Oracle/MS Dynamics 對標）。NX09-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx09_system_manual"."feature_key" IS 'feature 對應 key、命名規範：模組.功能.動作（如 nx04.so.create / nx05.ar.statement）';
COMMENT ON COLUMN "nx09_system_manual"."steps" IS '操作步驟 JSON 字串陣列';
COMMENT ON COLUMN "nx09_system_manual"."screenshots" IS 'screenshot URL JSON 字串陣列';
COMMENT ON COLUMN "nx09_system_manual"."category" IS '手冊分類（GENERAL / FAQ / TROUBLESHOOT）';
