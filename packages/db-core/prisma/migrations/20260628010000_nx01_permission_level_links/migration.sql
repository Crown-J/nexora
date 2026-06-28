-- 2026-06-28 Hank：職務↔權限拆分軌 Step2（加性）
-- 權限等級的兩張連結表（對應 role_permission / role_view、FK 改 permission_level_id）：
--   1. nx01_permission_level_permission（等級 × 229 細權限目錄）
--   2. nx01_permission_level_view（等級 × 畫面 + 6 動作旗標）
-- 不動現有 role_permission / role_view。

-- ============ 1. nx01_permission_level_permission ============
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_permission_level_permission_id" START 1;

CREATE OR REPLACE FUNCTION gen_nx01_permission_level_permission_id() RETURNS VARCHAR(15) AS $$
BEGIN
  RETURN 'NX01PLPM' || LPAD(nextval('seq_nx01_permission_level_permission_id')::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS "nx01_permission_level_permission" (
  "id"                  VARCHAR(15) NOT NULL DEFAULT gen_nx01_permission_level_permission_id(),
  "tenant_id"           VARCHAR(15) NOT NULL,
  "permission_level_id" VARCHAR(15) NOT NULL,
  "permission_id"       VARCHAR(15) NOT NULL,
  "granted_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "granted_by"          VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_permission_level_permission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx01_permission_level_permission"
  ADD CONSTRAINT "nx01_plp_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT "nx01_plp_level_id_fkey"
    FOREIGN KEY ("permission_level_id") REFERENCES "nx01_permission_level"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT "nx01_plp_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "nx01_permission"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE UNIQUE INDEX "nx01_plp_level_permission_key"
  ON "nx01_permission_level_permission"("permission_level_id", "permission_id");
CREATE INDEX "nx01_plp_tenant_level_idx"
  ON "nx01_permission_level_permission"("tenant_id", "permission_level_id");

-- ============ 2. nx01_permission_level_view ============
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_permission_level_view_id" START 1;

CREATE OR REPLACE FUNCTION gen_nx01_permission_level_view_id() RETURNS VARCHAR(15) AS $$
BEGIN
  RETURN 'NX01PLVW' || LPAD(nextval('seq_nx01_permission_level_view_id')::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS "nx01_permission_level_view" (
  "id"                  VARCHAR(15) NOT NULL DEFAULT gen_nx01_permission_level_view_id(),
  "tenant_id"           VARCHAR(15) NOT NULL,
  "permission_level_id" VARCHAR(15) NOT NULL,
  "view_id"             VARCHAR(15) NOT NULL,
  "can_read"            BOOLEAN NOT NULL DEFAULT true,
  "can_create"          BOOLEAN NOT NULL DEFAULT false,
  "can_update"          BOOLEAN NOT NULL DEFAULT false,
  "can_delete"          BOOLEAN NOT NULL DEFAULT false,
  "can_export"          BOOLEAN NOT NULL DEFAULT false,
  "can_approve"         BOOLEAN NOT NULL DEFAULT false,
  "is_active"           BOOLEAN NOT NULL DEFAULT true,
  "granted_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "granted_by"          VARCHAR(15),
  "revoked_at"          TIMESTAMP(3),
  "revoked_by"          VARCHAR(15),
  CONSTRAINT "nx01_permission_level_view_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx01_permission_level_view"
  ADD CONSTRAINT "nx01_plv_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT "nx01_plv_level_id_fkey"
    FOREIGN KEY ("permission_level_id") REFERENCES "nx01_permission_level"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT "nx01_plv_view_id_fkey"
    FOREIGN KEY ("view_id") REFERENCES "nx01_view"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE UNIQUE INDEX "nx01_plv_level_view_key"
  ON "nx01_permission_level_view"("permission_level_id", "view_id");
CREATE INDEX "nx01_plv_tenant_level_idx"
  ON "nx01_permission_level_view"("tenant_id", "permission_level_id");
