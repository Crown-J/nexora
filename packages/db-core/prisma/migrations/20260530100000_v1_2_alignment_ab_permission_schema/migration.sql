-- v1.2 對齊軌階段 A+B：新建用戶自定義 RBAC framework
-- 目標：v1.2 §12.2「負責人從零建角色 + 自由命名 + 勾權限」
-- 新增 2 張表（不動 Nx01Role / Nx01UserRole / Nx01RoleView 既有結構）
--
-- 1. Nx01Permission：系統權限目錄（無 tenant scope、所有租戶共用）
--    - code: 'sale.quote.list' 風格
--    - moduleCode/category/action：給 UI 分組顯示用
-- 2. Nx01RolePermission：角色 × 權限 m-n（per tenant）
--
-- 既有 Nx01Role：保留、後續用戶自定義角色寫入此表（isSystem=false、code 自由命名）
-- 既有 Nx01RoleView：保留作為「畫面層權限」舊範式、後續觀察是否 deprecate

-- ─────────────────────────────────────────
-- ID 生成器
-- ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_nx01_permission_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_permission_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PERM' || LPAD(nextval('seq_nx01_permission_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_role_permission_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_role_permission_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01ROPE' || LPAD(nextval('seq_nx01_role_permission_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ─────────────────────────────────────────
-- Nx01Permission：系統權限目錄
-- ─────────────────────────────────────────
CREATE TABLE "nx01_permission" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_permission_id(),
  "code" VARCHAR(60) NOT NULL,
  "module_code" VARCHAR(20) NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "action" VARCHAR(20) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "description" VARCHAR(200),
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nx01_permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx01_permission_code_key" ON "nx01_permission"("code");
CREATE INDEX "nx01_permission_mca_idx" ON "nx01_permission"("module_code", "category", "action");

-- ─────────────────────────────────────────
-- Nx01RolePermission：角色 × 權限 m-n
-- ─────────────────────────────────────────
CREATE TABLE "nx01_role_permission" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_role_permission_id(),
  "tenant_id" VARCHAR(15) NOT NULL,
  "role_id" VARCHAR(15) NOT NULL,
  "permission_id" VARCHAR(15) NOT NULL,
  "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "granted_by" VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_role_permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx01_role_permission_role_perm_unique"
  ON "nx01_role_permission"("role_id", "permission_id");

CREATE INDEX "nx01_role_permission_tenant_role_idx"
  ON "nx01_role_permission"("tenant_id", "role_id");

ALTER TABLE "nx01_role_permission"
  ADD CONSTRAINT "fk_nx01_role_permission_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id");

ALTER TABLE "nx01_role_permission"
  ADD CONSTRAINT "fk_nx01_role_permission_role"
  FOREIGN KEY ("role_id") REFERENCES "nx01_role"("id");

ALTER TABLE "nx01_role_permission"
  ADD CONSTRAINT "fk_nx01_role_permission_permission"
  FOREIGN KEY ("permission_id") REFERENCES "nx01_permission"("id");
