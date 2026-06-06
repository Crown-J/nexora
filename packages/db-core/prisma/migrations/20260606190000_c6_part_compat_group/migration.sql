-- packages/db-core/prisma/migrations/20260606190000_c6_part_compat_group/migration.sql
-- 02 對齊第二批 C 軌 CP2-c 2026-06-06：通用件群組（C6、總經理拍板）
--
-- 設計：
--   nx01_part_compat_group        群組主檔（業務員命名、tenant 內 unique code）
--   nx01_part_compat_group_member 多對多 member（part ↔ group、含 role + customPrice + isBidirectional）
--
-- role enum（SmallInt）：
--   1 = PRIMARY  主件（原廠／業務員指定的主要件）
--   2 = ALT      替代品
--
-- isBidirectional：true = A↔B 互為替代品；false = 單向 A→B（B 找不到 A）
-- customPrice：null = 沿用 part 主檔售價；有值 = 群組內成員專屬售價（如同行調貨價）

CREATE SEQUENCE IF NOT EXISTS "seq_nx01_part_compat_group_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_compat_group_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PCGP' || LPAD(nextval('seq_nx01_part_compat_group_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS "seq_nx01_part_compat_group_member_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_compat_group_member_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PCMB' || LPAD(nextval('seq_nx01_part_compat_group_member_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx01_part_compat_group" (
  "id"          VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_compat_group_id(),
  "tenant_id"   VARCHAR(15) NOT NULL,
  "code"        VARCHAR(30) NOT NULL,
  "name"        VARCHAR(100) NOT NULL,
  "remark"      VARCHAR(200),
  "sort_no"     INTEGER NOT NULL DEFAULT 0,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"  VARCHAR(15) NOT NULL,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"  VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_part_compat_group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_part_compat_group_tenant_id_code_key"
  ON "nx01_part_compat_group" ("tenant_id", "code");

ALTER TABLE "nx01_part_compat_group"
  ADD CONSTRAINT "nx01_part_compat_group_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx01_part_compat_group_member" (
  "id"                VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_compat_group_member_id(),
  "tenant_id"         VARCHAR(15) NOT NULL,
  "group_id"          VARCHAR(15) NOT NULL,
  "part_id"           VARCHAR(15) NOT NULL,
  "role"              SMALLINT NOT NULL DEFAULT 2,  -- 1=PRIMARY / 2=ALT
  "custom_price"      DECIMAL(14, 2),
  "is_bidirectional"  BOOLEAN NOT NULL DEFAULT true,
  "sort_no"           INTEGER NOT NULL DEFAULT 0,
  "remark"            VARCHAR(200),
  "is_active"         BOOLEAN NOT NULL DEFAULT true,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"        VARCHAR(15) NOT NULL,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"        VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_part_compat_group_member_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_part_compat_group_member_group_part_key"
  ON "nx01_part_compat_group_member" ("tenant_id", "group_id", "part_id");

CREATE INDEX IF NOT EXISTS "nx01_part_compat_group_member_part_idx"
  ON "nx01_part_compat_group_member" ("tenant_id", "part_id");

ALTER TABLE "nx01_part_compat_group_member"
  ADD CONSTRAINT "nx01_part_compat_group_member_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "nx01_part_compat_group_member"
  ADD CONSTRAINT "nx01_part_compat_group_member_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "nx01_part_compat_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nx01_part_compat_group_member"
  ADD CONSTRAINT "nx01_part_compat_group_member_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx01_part" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
