-- TASK-PHASE2-NX01-USER-ROLE-SCHEMA-EXTEND-01
-- nx01_user 補建：帳號鎖定機制（NX01-01 §3.6）+ email composite unique（NX01-01 §3.1）
--
-- 變更：
--   1. ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0
--   2. ADD COLUMN locked_until TIMESTAMP(3) NULL
--   3. ADD UNIQUE INDEX (tenant_id, email)
--
-- 命名 drift 處理（A034、Hank 拍方向 B）：
--   - 規格書 username / display_name / mobile vs schema userAccount / userName / phone
--   - 對齊「既有慣例優先於新建議」紀律（軌 A rev_Nx01Partner_salesUserId 範式）
--   - 既有 30+ application 層引用 userAccount/userName/phone（auth.service / user.service）
--   - rename schema 風險高、超出本 task scope
--   - schema 不動命名、Alex 後續 update NX01-01 規格書 v1.1 對齊既有 schema

-- AlterTable
ALTER TABLE "nx01_user"
ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "locked_until" TIMESTAMP(3);

-- CreateIndex（email composite unique 含 tenantId）
-- PostgreSQL 預設 NULL 不衝突 unique、nullable email 可多筆 NULL
-- 對齊 NX01-01 §3.1「(tenantId, email) UNIQUE」
CREATE UNIQUE INDEX "nx01_user_tenant_id_email_key" ON "nx01_user"("tenant_id", "email");
