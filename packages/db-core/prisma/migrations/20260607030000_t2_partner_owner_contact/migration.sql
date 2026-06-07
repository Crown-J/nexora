-- packages/db-core/prisma/migrations/20260607030000_t2_partner_owner_contact/migration.sql
-- 02 第三批 T2 2026-06-07：partner 加公司負責人 + 聯絡窗口子表
--
-- 1. nx01_partner 加 owner_name（對方公司負責人姓名、與本公司業務歸屬 sales_user_id 不同）
-- 2. 新表 nx01_partner_contact：多筆聯絡窗口（窗口姓名 + 職務部門 + 電話分機 + 手機 + Email + 備註 + sortNo）

ALTER TABLE "nx01_partner" ADD COLUMN IF NOT EXISTS "owner_name" VARCHAR(50);

CREATE SEQUENCE IF NOT EXISTS "seq_nx01_partner_contact_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_partner_contact_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PCNT' || LPAD(nextval('seq_nx01_partner_contact_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx01_partner_contact" (
  "id"              VARCHAR(15) NOT NULL DEFAULT gen_nx01_partner_contact_id(),
  "tenant_id"       VARCHAR(15) NOT NULL,
  "partner_id"      VARCHAR(15) NOT NULL,
  "contact_name"    VARCHAR(50) NOT NULL,
  -- 職務部門（自由文字、不綁 nx01_department；對方公司部門可能跟本租戶部門主檔不同名）
  "job_title"       VARCHAR(50),
  "phone"           VARCHAR(30),
  "phone_ext"       VARCHAR(20),
  "mobile"          VARCHAR(30),
  "email"           VARCHAR(100),
  "note"            VARCHAR(200),
  "sort_no"         INTEGER NOT NULL DEFAULT 0,
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"      VARCHAR(15) NOT NULL,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"      VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_partner_contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "nx01_partner_contact_partner_idx"
  ON "nx01_partner_contact" ("tenant_id", "partner_id");

ALTER TABLE "nx01_partner_contact"
  ADD CONSTRAINT "nx01_partner_contact_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "nx01_partner_contact"
  ADD CONSTRAINT "nx01_partner_contact_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "nx01_partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
