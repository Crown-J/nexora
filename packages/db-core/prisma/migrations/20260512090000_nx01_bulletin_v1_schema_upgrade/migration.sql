-- TASK-PHASE2-NX01-08-BULLETIN-IMPL-01
-- NX01-08 公告系統 v1.0 schema 升級（軌 3）
--
-- 變更摘要：
--   1. nx01_bulletin 加 6 欄位（categoryId / importance / audienceUserIds / publishAt / status / readCount）
--      - 全 nullable / default、不破壞既有資料
--      - type 欄位保留（v0 遺留 S/C/R、後續 task 廢棄）
--   2. 新建 nx01_bulletin_category 子表（含 audience_logic / tier_required / team_id FK）
--   3. 新建 nx01_bulletin_attachment 子表（接軌 1 file-upload service、storage_key 跨 backend）
--   4. 新建 nx01_bulletin_read_log 子表（PK = (bulletin_id, user_id) unique）
--   5. ID 生成 function：gen_nx01_bulletin_category_id() / gen_nx01_bulletin_attachment_id() / gen_nx01_bulletin_read_log_id()
--
-- 紀律：
--   - 全 nullable + default、零 destructive、既有資料不破壞
--   - readCount default 0（後續 task 加 trigger 自動更新、本軌 application 層手動更新）
--   - status default 'draft'（既有公告 backfill 為 draft、需 application 層升級為 published）

-- =============================================================================
-- 1. ID 生成 function（對齊既有 gen_*_id() 範式：[NX01]+[4字]+[7位]）
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx01_bulletin_category_id;
CREATE OR REPLACE FUNCTION gen_nx01_bulletin_category_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01BCAT' || LPAD(nextval('seq_nx01_bulletin_category_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_bulletin_attachment_id;
CREATE OR REPLACE FUNCTION gen_nx01_bulletin_attachment_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01BATT' || LPAD(nextval('seq_nx01_bulletin_attachment_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_bulletin_read_log_id;
CREATE OR REPLACE FUNCTION gen_nx01_bulletin_read_log_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01BRLG' || LPAD(nextval('seq_nx01_bulletin_read_log_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =============================================================================
-- 2. nx01_bulletin_category 子表
-- =============================================================================

CREATE TABLE "nx01_bulletin_category" (
  "id"             VARCHAR(15) NOT NULL DEFAULT gen_nx01_bulletin_category_id(),
  "tenant_id"      VARCHAR(15) NOT NULL,
  "code"           VARCHAR(30) NOT NULL,
  "name"           VARCHAR(50) NOT NULL,
  "audience_logic" VARCHAR(20) NOT NULL,
  "team_id"        VARCHAR(15),
  "tier_required"  VARCHAR(10) NOT NULL DEFAULT 'LITE',
  "is_system"      BOOLEAN     NOT NULL DEFAULT false,
  "sort_order"     INTEGER     NOT NULL DEFAULT 0,
  "is_active"      BOOLEAN     NOT NULL DEFAULT true,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"     VARCHAR(15) NOT NULL,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  "updated_by"     VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_bulletin_category_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "nx01_bulletin_category_tenant_id_code_unique" UNIQUE ("tenant_id", "code")
);

ALTER TABLE "nx01_bulletin_category"
  ADD CONSTRAINT "nx01_bulletin_category_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_bulletin_category"
  ADD CONSTRAINT "nx01_bulletin_category_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "nx01_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- 3. nx01_bulletin schema 升級（加 6 欄位、保留 type/isPinned 既有 backward compat）
-- =============================================================================

ALTER TABLE "nx01_bulletin"
  ADD COLUMN "category_id"        VARCHAR(15),
  ADD COLUMN "importance"         VARCHAR(20)  NOT NULL DEFAULT 'normal',
  ADD COLUMN "audience_user_ids"  VARCHAR(15)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(15)[],
  ADD COLUMN "publish_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "status"             VARCHAR(20)  NOT NULL DEFAULT 'draft',
  ADD COLUMN "read_count"         INTEGER      NOT NULL DEFAULT 0;

ALTER TABLE "nx01_bulletin"
  ADD CONSTRAINT "nx01_bulletin_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "nx01_bulletin_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- 4. nx01_bulletin_attachment 子表（接軌 1 file-upload service）
-- =============================================================================

CREATE TABLE "nx01_bulletin_attachment" (
  "id"                VARCHAR(15) NOT NULL DEFAULT gen_nx01_bulletin_attachment_id(),
  "tenant_id"         VARCHAR(15) NOT NULL,
  "bulletin_id"       VARCHAR(15) NOT NULL,
  "storage_key"       VARCHAR(500) NOT NULL,
  "mime_type"         VARCHAR(100) NOT NULL,
  "file_size"         INTEGER      NOT NULL,
  "orig_filename"     VARCHAR(255) NOT NULL,
  "uploader_user_id"  VARCHAR(15)  NOT NULL,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nx01_bulletin_attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nx01_bulletin_attachment_bulletin_id_idx" ON "nx01_bulletin_attachment"("bulletin_id");

ALTER TABLE "nx01_bulletin_attachment"
  ADD CONSTRAINT "nx01_bulletin_attachment_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_bulletin_attachment"
  ADD CONSTRAINT "nx01_bulletin_attachment_bulletin_id_fkey"
  FOREIGN KEY ("bulletin_id") REFERENCES "nx01_bulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nx01_bulletin_attachment"
  ADD CONSTRAINT "nx01_bulletin_attachment_uploader_user_id_fkey"
  FOREIGN KEY ("uploader_user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- 5. nx01_bulletin_read_log 子表（PK = (bulletin_id, user_id) unique）
-- =============================================================================

CREATE TABLE "nx01_bulletin_read_log" (
  "id"                 VARCHAR(15) NOT NULL DEFAULT gen_nx01_bulletin_read_log_id(),
  "tenant_id"          VARCHAR(15) NOT NULL,
  "bulletin_id"        VARCHAR(15) NOT NULL,
  "user_id"            VARCHAR(15) NOT NULL,
  "read_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_duration_ms"   INTEGER,
  CONSTRAINT "nx01_bulletin_read_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "nx01_bulletin_read_log_bulletin_id_user_id_unique" UNIQUE ("bulletin_id", "user_id")
);

CREATE INDEX "nx01_bulletin_read_log_user_id_idx" ON "nx01_bulletin_read_log"("user_id");

ALTER TABLE "nx01_bulletin_read_log"
  ADD CONSTRAINT "nx01_bulletin_read_log_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_bulletin_read_log"
  ADD CONSTRAINT "nx01_bulletin_read_log_bulletin_id_fkey"
  FOREIGN KEY ("bulletin_id") REFERENCES "nx01_bulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nx01_bulletin_read_log"
  ADD CONSTRAINT "nx01_bulletin_read_log_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
