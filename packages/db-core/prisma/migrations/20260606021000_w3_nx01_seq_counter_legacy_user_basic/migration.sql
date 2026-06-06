-- packages/db-core/prisma/migrations/20260606021000_w3_nx01_seq_counter_legacy_user_basic/migration.sql
-- W3 純精簡 schema additive（Alex 拍板選項 C：本軌不混 prisma 7 normalize drift cleanup）
-- 對齊 NX-MANUAL-02 v2.0：
--   [3-1] 員工編號 / 往來對象編號制式 + 自動產生（Nx01SeqCounter 表）
--   [3-2] 員工 / 往來對象「舊代號」欄位（legacy_code）
--   [3-3] 員工 basic zone 補 7 欄位
-- 73 個 schema drift（含 6 個 timestamp 精度截斷 + 1 個 DROP DEFAULT）獨立 W3.5 軌另處理。
-- 全程冪等（IF NOT EXISTS / IF NOT EXISTS COLUMN）可安全重跑。

-- ============================================================
-- 1. Nx01SeqCounter primary key 用 sequence + function
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_seq_counter_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_seq_counter_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01SQCT' || LPAD(nextval('seq_nx01_seq_counter_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================
-- 2. [3-2] nx01_partner 加 legacy_code（純對照、不綁 FK）
-- ============================================================
ALTER TABLE "nx01_partner" ADD COLUMN IF NOT EXISTS "legacy_code" VARCHAR(50);

-- ============================================================
-- 3. [3-3] nx01_user 加 7 個 basic zone 欄位 + [3-2] legacy_code
-- ============================================================
ALTER TABLE "nx01_user"
  ADD COLUMN IF NOT EXISTS "gender"            VARCHAR(1),
  ADD COLUMN IF NOT EXISTS "birthday"          DATE,
  ADD COLUMN IF NOT EXISTS "national_id"       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "address"           VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "hire_date"         DATE,
  ADD COLUMN IF NOT EXISTS "emergency_contact" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "emergency_phone"   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "legacy_code"       VARCHAR(50);

-- ============================================================
-- 4. [3-1] nx01_seq_counter 新表（租戶內編號流水）
-- ============================================================
CREATE TABLE IF NOT EXISTS "nx01_seq_counter" (
    "id"         VARCHAR(15) NOT NULL DEFAULT gen_nx01_seq_counter_id(),
    "tenant_id"  VARCHAR(15) NOT NULL,
    "scope"      VARCHAR(20) NOT NULL,
    "next_no"    INTEGER     NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nx01_seq_counter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_seq_counter_tenant_id_scope_key"
  ON "nx01_seq_counter"("tenant_id", "scope");

ALTER TABLE "nx01_seq_counter"
  DROP CONSTRAINT IF EXISTS "nx01_seq_counter_tenant_id_fkey";
ALTER TABLE "nx01_seq_counter"
  ADD CONSTRAINT "nx01_seq_counter_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
