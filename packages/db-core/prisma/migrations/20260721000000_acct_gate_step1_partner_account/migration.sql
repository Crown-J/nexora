-- packages/db-core/prisma/migrations/20260721000000_acct_gate_step1_partner_account/migration.sql
-- 往來帳戶閘門 Step 1 資料層（規格 docs/專案/規格書/核心/往來帳戶閘門-設計規格.md v1.2、2026-07-21 執行長拍板）
--   1. 新表 nx01_partner_account：R=收款帳戶（銷售閘門）/ P=付款帳戶（採購+同行調貨閘門）
--   2. nx01_partner.is_cash_customer：無統編具名客戶標記（可銷售、不開 R 戶不掛應收）
--   3. 既有戶自動開戶（遷移祖父條款）：C/O→R、S/V/T/O→P、待補件標記
--   本步行為零變化（閘門在 Step 2 才切換）
-- ⚠️ 本機 migration 追蹤表壞 → 以 prisma db execute 手動套用（不走 migrate dev、沿用 0720 偉盟範式）

-- ── 1. ID 產生器 ─────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_nx01_partner_account_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_partner_account_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PACT' || LPAD(nextval('seq_nx01_partner_account_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ── 2. 帳戶表 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "nx01_partner_account" (
  "id"              VARCHAR(15) NOT NULL DEFAULT gen_nx01_partner_account_id(),
  "tenant_id"       VARCHAR(15) NOT NULL,
  "partner_id"      VARCHAR(15) NOT NULL,
  -- 方向：R=收款帳戶（他付我、銷售閘門）/ P=付款帳戶（我付他、採購+同行調貨閘門）
  "direction"       VARCHAR(1)  NOT NULL,
  -- 狀態：A=啟用 / S=停用
  "status"          VARCHAR(1)  NOT NULL DEFAULT 'A',
  -- P 戶匯款路徑（R 戶不需要）
  "bank_name"       VARCHAR(100),
  "bank_code"       VARCHAR(10),
  "bank_account_no" VARCHAR(30),
  "account_holder"  VARCHAR(100),
  -- 祖父條款待補件標記（R=統編未補 / P=銀行帳號未補）
  "needs_backfill"  BOOLEAN     NOT NULL DEFAULT false,
  "opened_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "opened_by"       VARCHAR(15) NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"      VARCHAR(15) NOT NULL,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"      VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_partner_account_pkey" PRIMARY KEY ("id")
);

-- 一對象一方向一戶（多銀行戶擴充＝將來放寬此鍵、拍板先限一戶）
CREATE UNIQUE INDEX IF NOT EXISTS "nx01_partner_account_tenant_partner_direction_key"
  ON "nx01_partner_account" ("tenant_id", "partner_id", "direction");
-- 閘門查詢主索引（listPartner hasAccount= 過濾用）
CREATE INDEX IF NOT EXISTS "nx01_partner_account_tenant_direction_status_idx"
  ON "nx01_partner_account" ("tenant_id", "direction", "status");
CREATE INDEX IF NOT EXISTS "nx01_partner_account_partner_id_idx"
  ON "nx01_partner_account" ("partner_id");

-- ── 3. 現金客戶旗標 ──────────────────────────────────────────────────────
ALTER TABLE nx01_partner ADD COLUMN IF NOT EXISTS is_cash_customer BOOLEAN NOT NULL DEFAULT false;

-- ── 4. 既有戶自動開戶（冪等：unique 鍵擋重跑）────────────────────────────
-- R 收款戶：保養廠 C + 同行 O（統編空 → 待補件）
INSERT INTO nx01_partner_account
  (tenant_id, partner_id, direction, needs_backfill, opened_by, created_by, updated_by)
SELECT tenant_id, id, 'R', (tax_id IS NULL OR tax_id = ''),
       'NX01USER0000001', 'NX01USER0000001', 'NX01USER0000001'
FROM nx01_partner
WHERE is_active = true AND partner_type IN ('C', 'O')
ON CONFLICT (tenant_id, partner_id, direction) DO NOTHING;

-- P 付款戶：供應商 S + 一般廠商 V + 外包物流 T + 同行 O（銀行帳號遷移時必空 → 全標待補件）
INSERT INTO nx01_partner_account
  (tenant_id, partner_id, direction, needs_backfill, opened_by, created_by, updated_by)
SELECT tenant_id, id, 'P', true,
       'NX01USER0000001', 'NX01USER0000001', 'NX01USER0000001'
FROM nx01_partner
WHERE is_active = true AND partner_type IN ('S', 'V', 'T', 'O')
ON CONFLICT (tenant_id, partner_id, direction) DO NOTHING;
