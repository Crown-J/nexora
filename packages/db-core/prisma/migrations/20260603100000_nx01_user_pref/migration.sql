-- packages/db-core/prisma/migrations/20260603100000_nx01_user_pref/migration.sql
-- 首頁儀表板段 B 前置：新增 nx01_user_pref 表
--
-- 用途：使用者層級的個人偏好設定（user × pref_key、JSONB value、彈性結構）
-- 範圍：純 additive（新增 1 表 + 1 sequence + 1 function、不動任何既有表）
-- 性質：本機開發、Railway 完全不碰
--
-- 設計重點：
-- - 對齊既有 nx01_user_page_guide 範式（同樣是 user × key 設計、本表是它的兄弟）
-- - pref_value 用 JSONB、5 格儀表板設定可彈性塞 { viewCode, metricType, ... }
-- - 未來個人偏好（主題/預設頁/提醒設定/快捷鍵...）都走這張表、加新 pref_key 即可
-- - 唯一約束 (user_id, pref_key) 同 user_page_guide、租戶內也唯一（user_id 已隱含租戶）

-- ─────────────────────────────────────────
-- 1. sequence + id generator function
-- ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_nx01_user_pref_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_user_pref_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01UPRF' || LPAD(nextval('seq_nx01_user_pref_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ─────────────────────────────────────────
-- 2. nx01_user_pref 表
-- ─────────────────────────────────────────
CREATE TABLE "nx01_user_pref" (
  "id"          VARCHAR(15)   NOT NULL DEFAULT gen_nx01_user_pref_id(),
  "tenant_id"   VARCHAR(15)   NOT NULL,
  "user_id"     VARCHAR(15)   NOT NULL,
  "pref_key"    VARCHAR(100)  NOT NULL,
  "pref_value"  JSONB         NOT NULL,
  "created_at"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"  VARCHAR(15)   NOT NULL,
  "updated_at"  TIMESTAMP(3)  NOT NULL,
  "updated_by"  VARCHAR(15)   NOT NULL,
  CONSTRAINT "nx01_user_pref_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────
-- 3. unique：user × pref_key 一筆（同 page_guide 範式）
-- ─────────────────────────────────────────
CREATE UNIQUE INDEX "nx01_user_pref_user_key_uq"
  ON "nx01_user_pref"("user_id", "pref_key");

-- ─────────────────────────────────────────
-- 4. FK：tenant_id → nx99_tenant、user_id → nx01_user
-- ─────────────────────────────────────────
ALTER TABLE "nx01_user_pref"
  ADD CONSTRAINT "fk_nx01_user_pref_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id");

ALTER TABLE "nx01_user_pref"
  ADD CONSTRAINT "fk_nx01_user_pref_user"
  FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id");
