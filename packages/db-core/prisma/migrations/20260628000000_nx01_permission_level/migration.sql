-- 2026-06-28 Hank：職務↔權限拆分軌 Step1（加性、不動現有 RBAC）
-- 1. ID generator function gen_nx01_permission_level_id()（同範式 gen_nx01_xxx_id()）
-- 2. 新建 nx01_permission_level 表（權限等級、RBAC 載體）
-- 3. nx01_user 加 permission_level_id 欄位（nullable + FK、一人一等級）
-- 不動 nx01_role / role_view / role_permission，現行權限守衛不受影響。

-- 1. 序列 + ID generator
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_permission_level_id" START 1;

CREATE OR REPLACE FUNCTION gen_nx01_permission_level_id() RETURNS VARCHAR(15) AS $$
BEGIN
  RETURN 'NX01PMLV' || LPAD(nextval('seq_nx01_permission_level_id')::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. 新表 nx01_permission_level
CREATE TABLE IF NOT EXISTS "nx01_permission_level" (
  "id"          VARCHAR(15) NOT NULL DEFAULT gen_nx01_permission_level_id(),
  "tenant_id"   VARCHAR(15) NOT NULL,
  "code"        VARCHAR(30) NOT NULL,
  "name"        VARCHAR(50) NOT NULL,
  "description" VARCHAR(200),
  "is_system"   BOOLEAN NOT NULL DEFAULT false,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "sort_no"     INTEGER NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"  VARCHAR(15) NOT NULL,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "updated_by"  VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_permission_level_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx01_permission_level"
  ADD CONSTRAINT "nx01_permission_level_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE UNIQUE INDEX "nx01_permission_level_tenant_id_code_key"
  ON "nx01_permission_level"("tenant_id", "code");

-- 3. nx01_user 加 permission_level_id（nullable + FK）
ALTER TABLE "nx01_user"
  ADD COLUMN IF NOT EXISTS "permission_level_id" VARCHAR(15);

ALTER TABLE "nx01_user"
  ADD CONSTRAINT "nx01_user_permission_level_id_fkey"
    FOREIGN KEY ("permission_level_id") REFERENCES "nx01_permission_level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
