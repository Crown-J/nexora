-- NX00 模組（資料字典）：基本資料、組織、選單、權限、關聯表、參數、檔案、工作日誌
-- ID 前綴與長度對齊既有 gen_nx00_*（VARCHAR(15)）

CREATE SEQUENCE IF NOT EXISTS seq_nx00_basic_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_basic_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BASC' || LPAD(nextval('seq_nx00_basic_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_org_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_org_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00ORGN' || LPAD(nextval('seq_nx00_org_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_menu_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_menu_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00MNUS' || LPAD(nextval('seq_nx00_menu_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_perm_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_perm_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PERM' || LPAD(nextval('seq_nx00_perm_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_romu_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_role_menu_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00ROMU' || LPAD(nextval('seq_nx00_romu_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_ropr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_role_permission_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00ROPR' || LPAD(nextval('seq_nx00_ropr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_param_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_param_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PARA' || LPAD(nextval('seq_nx00_param_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_file_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_file_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00FILF' || LPAD(nextval('seq_nx00_file_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_dlog_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_daily_log_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00DLOG' || LPAD(nextval('seq_nx00_dlog_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ---------------------------------------------------------------------------
CREATE TABLE "nx00_basic" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_basic_id(),
    "basic_code" VARCHAR(50) NOT NULL,
    "basic_name" VARCHAR(100) NOT NULL,
    "basic_type" VARCHAR(20),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(1),
    "remark" VARCHAR(500),
    "is_deleted" VARCHAR(1) NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_basic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx00_basic_basic_code_key" ON "nx00_basic"("basic_code");

CREATE TABLE "nx00_org" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_org_id(),
    "org_code" VARCHAR(50) NOT NULL,
    "org_name" VARCHAR(100) NOT NULL,
    "parent_id" VARCHAR(15),
    "org_type" VARCHAR(20),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(1),
    "is_deleted" VARCHAR(1) NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_org_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx00_org_org_code_key" ON "nx00_org"("org_code");

CREATE TABLE "nx00_menu" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_menu_id(),
    "menu_name" VARCHAR(100) NOT NULL,
    "menu_url" VARCHAR(255),
    "parent_id" VARCHAR(15),
    "icon" VARCHAR(50),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(1),
    "is_deleted" VARCHAR(1) NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_menu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nx00_permission" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_perm_id(),
    "permission_code" VARCHAR(50) NOT NULL,
    "permission_name" VARCHAR(100) NOT NULL,
    "menu_id" VARCHAR(15),
    "is_deleted" VARCHAR(1) NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx00_permission_permission_code_key" ON "nx00_permission"("permission_code");

CREATE TABLE "nx00_role_menu" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_role_menu_id(),
    "role_id" VARCHAR(15) NOT NULL,
    "menu_id" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx00_role_menu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nx00_role_permission" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_role_permission_id(),
    "role_id" VARCHAR(15) NOT NULL,
    "permission_id" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx00_role_permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nx00_param" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_param_id(),
    "param_code" VARCHAR(50) NOT NULL,
    "param_value" VARCHAR(500),
    "remark" VARCHAR(500),
    "is_deleted" VARCHAR(1) NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_param_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx00_param_param_code_key" ON "nx00_param"("param_code");

CREATE TABLE "nx00_file" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_file_id(),
    "file_name" VARCHAR(200) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER,
    "file_ext" VARCHAR(10),
    "is_deleted" VARCHAR(1) NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_file_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nx00_daily_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_daily_log_id(),
    "log_date" TIMESTAMP(3) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "work_content" VARCHAR(2000),
    "unfinished_work" VARCHAR(2000),
    "next_plan" VARCHAR(2000),
    "remark" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_daily_log_pkey" PRIMARY KEY ("id")
);

-- nx00_user.org_id（資料字典：所屬機構）
ALTER TABLE "nx00_user" ADD COLUMN "org_id" VARCHAR(15);

-- FKs
ALTER TABLE "nx00_org" ADD CONSTRAINT "nx00_org_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "nx00_org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_menu" ADD CONSTRAINT "nx00_menu_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "nx00_menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_permission" ADD CONSTRAINT "nx00_permission_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "nx00_menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_role_menu" ADD CONSTRAINT "nx00_role_menu_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx00_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx00_role_menu" ADD CONSTRAINT "nx00_role_menu_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "nx00_menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx00_role_permission" ADD CONSTRAINT "nx00_role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx00_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx00_role_permission" ADD CONSTRAINT "nx00_role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "nx00_permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "nx00_org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_daily_log" ADD CONSTRAINT "nx00_daily_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx00_basic" ADD CONSTRAINT "nx00_basic_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_basic" ADD CONSTRAINT "nx00_basic_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_org" ADD CONSTRAINT "nx00_org_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_org" ADD CONSTRAINT "nx00_org_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_menu" ADD CONSTRAINT "nx00_menu_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_menu" ADD CONSTRAINT "nx00_menu_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_permission" ADD CONSTRAINT "nx00_permission_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_permission" ADD CONSTRAINT "nx00_permission_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_param" ADD CONSTRAINT "nx00_param_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_param" ADD CONSTRAINT "nx00_param_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_file" ADD CONSTRAINT "nx00_file_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_file" ADD CONSTRAINT "nx00_file_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_daily_log" ADD CONSTRAINT "nx00_daily_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_daily_log" ADD CONSTRAINT "nx00_daily_log_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "nx00_role_menu_role_id_menu_id_key" ON "nx00_role_menu"("role_id", "menu_id");
CREATE UNIQUE INDEX "nx00_role_permission_role_id_permission_id_key" ON "nx00_role_permission"("role_id", "permission_id");

CREATE INDEX "nx00_org_parent_id_idx" ON "nx00_org"("parent_id");
CREATE INDEX "nx00_menu_parent_id_idx" ON "nx00_menu"("parent_id");
CREATE INDEX "nx00_permission_menu_id_idx" ON "nx00_permission"("menu_id");
CREATE INDEX "nx00_daily_log_user_id_idx" ON "nx00_daily_log"("user_id");
CREATE INDEX "nx00_daily_log_log_date_idx" ON "nx00_daily_log"("log_date");
CREATE INDEX "nx00_user_org_id_idx" ON "nx00_user"("org_id");
