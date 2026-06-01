-- packages/db-core/prisma/migrations/20260602100000_platform_admin_p1/migration.sql
-- 平台層 vs 租戶層分離軌 Phase 1：新增 platform_admin 表
--
-- 範圍：純 additive（新增 1 表 + 1 sequence + 1 function、不動既有表）
-- 性質：本機開發專用、Railway 完全不碰、簽約前 2-4 週統一 TASK-RAILWAY-ENV-SPLIT
--
-- 設計重點：
-- - 平台層使用者（伊諾瓦營運）與租戶層員工（客戶用）徹底分家、不共用 nx01_user。
-- - created_by / updated_by 用 VARCHAR(15) scalar、不建 FK（跨層不耦合、跟 nx99_tenant 範式一致）。
-- - 首筆 seed 時 created_by = updated_by = 自己 id（PLATADMN0000001、自參考、無 FK 問題）。
-- - 不建 platform_admin_role 表（v1 只有 super admin 一種、YAGNI）。
-- - 不建 platform_audit_log 表（v1 用客戶租戶 nx99_tenant.created_by 追溯即可）。

-- ─────────────────────────────────────────
-- 1. sequence + ID generator function
-- ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_platform_admin_id START 1;

CREATE OR REPLACE FUNCTION gen_platform_admin_id()
RETURNS VARCHAR AS $$
  SELECT 'PLATADMN' || LPAD(nextval('seq_platform_admin_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ─────────────────────────────────────────
-- 2. platform_admin 表
-- ─────────────────────────────────────────
CREATE TABLE "platform_admin" (
  "id"                    VARCHAR(15)  NOT NULL DEFAULT gen_platform_admin_id(),
  "account"               VARCHAR(50)  NOT NULL,
  "password_hash"         VARCHAR(255) NOT NULL,
  "display_name"          VARCHAR(50)  NOT NULL,
  "email"                 VARCHAR(100),
  "phone"                 VARCHAR(20),
  "is_active"             BOOLEAN      NOT NULL DEFAULT TRUE,
  "must_change_password"  BOOLEAN      NOT NULL DEFAULT FALSE,
  "last_login_at"         TIMESTAMP(3),
  "failed_login_count"    INTEGER      NOT NULL DEFAULT 0,
  "locked_until"          TIMESTAMP(3),
  "remark"                VARCHAR(200),
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"            VARCHAR(15)  NOT NULL,
  "updated_at"            TIMESTAMP(3) NOT NULL,
  "updated_by"            VARCHAR(15)  NOT NULL,
  CONSTRAINT "platform_admin_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────
-- 3. unique index：account 跨平台唯一（不分租戶、平台層只有一個 namespace）
-- ─────────────────────────────────────────
CREATE UNIQUE INDEX "platform_admin_account_key" ON "platform_admin"("account");
