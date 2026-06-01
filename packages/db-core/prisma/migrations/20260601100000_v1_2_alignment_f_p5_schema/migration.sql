-- v1.2 對齊軌 階段 F P5：schema 變動（3 項、additive only、NULL 兼容）
-- 對應意圖書 B 一票對多 + E 催款 + D 保固理賠退錢金額（總經理 2026-06-01 拍板）
-- Alex 拍板：§1=1a 新表 / §2=2a 新表 / §3 完整做（C 案系統帶建議值 + 三選一）
--
-- 性質：⚠️ 含 ALTER TABLE ADD COLUMN（既有 row 影響 0、NULL 兼容、不改 NOT NULL）
-- 既有資料影響：
--   - 新表 2 個：纯 ADD、既有 0 筆
--   - nx02_warranty_claim：加 2 欄 NULL、既有 row 不需回填
-- 回滾：附 down 段（最後）

-- ============================================================
-- §1. nx05_paylog_settlement（一對多沖銷對應、§1=1a）
-- ============================================================
-- 業務語意：一筆收/付款（paylog）可沖多筆 AR 或多筆 AP
--   - 一筆 settlement 必須恰好擇一（arId 或 apId、不可同時、不可同空）
--   - settledAmount = 該筆沖了多少（部分收款支援）
--   - 既有 paylog.arId/apId/amount 不動（28 處引用兼容、新版透過此表記）

CREATE SEQUENCE IF NOT EXISTS seq_nx05_paylog_settlement_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_paylog_settlement_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05PYST' || LPAD(nextval('seq_nx05_paylog_settlement_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE "nx05_paylog_settlement" (
  "id"             VARCHAR(15) NOT NULL DEFAULT gen_nx05_paylog_settlement_id(),
  "tenant_id"      VARCHAR(15) NOT NULL,
  "paylog_id"      VARCHAR(15) NOT NULL,
  "ar_id"          VARCHAR(15),
  "ap_id"          VARCHAR(15),
  "settled_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "remark"         VARCHAR(200),
  "created_at"     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"     VARCHAR(15) NOT NULL,
  "updated_at"     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"     VARCHAR(15) NOT NULL,
  CONSTRAINT "pk_nx05_paylog_settlement" PRIMARY KEY ("id"),
  CONSTRAINT "fk_nx05_paylog_settlement_tenant"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id"),
  CONSTRAINT "fk_nx05_paylog_settlement_paylog"
    FOREIGN KEY ("paylog_id") REFERENCES "nx05_paylog"("id"),
  CONSTRAINT "fk_nx05_paylog_settlement_ar"
    FOREIGN KEY ("ar_id") REFERENCES "nx05_ar_ledger"("id"),
  CONSTRAINT "fk_nx05_paylog_settlement_ap"
    FOREIGN KEY ("ap_id") REFERENCES "nx05_ap_ledger"("id"),
  -- 業務 invariant：必須恰好擇一 ar_id 或 ap_id（不可同時、不可同空）
  CONSTRAINT "chk_nx05_paylog_settlement_ar_xor_ap"
    CHECK (("ar_id" IS NOT NULL AND "ap_id" IS NULL) OR ("ar_id" IS NULL AND "ap_id" IS NOT NULL))
);

CREATE INDEX "idx_nx05_paylog_settlement_tenant" ON "nx05_paylog_settlement" ("tenant_id");
CREATE INDEX "idx_nx05_paylog_settlement_paylog" ON "nx05_paylog_settlement" ("paylog_id");
CREATE INDEX "idx_nx05_paylog_settlement_ar" ON "nx05_paylog_settlement" ("ar_id");
CREATE INDEX "idx_nx05_paylog_settlement_ap" ON "nx05_paylog_settlement" ("ap_id");

COMMENT ON TABLE "nx05_paylog_settlement" IS
  '一筆收/付款（paylog）對多筆 AR/AP 沖銷對應表。一筆 settlement 必擇一 AR 或 AP、settled_amount 記該筆沖了多少。對齊階段 F P5 意圖書 B 一票對多 + Alex Q1=1a';

-- ============================================================
-- §2. nx05_ar_reminder_log（催款歷史、§2=2a）
-- ============================================================
-- 業務語意：每次催客戶記一筆、可追歷史多次催款
--   - Alex E②=A「純內部記錄」、不寄 email/簡訊（後續軌自動寄送）

CREATE SEQUENCE IF NOT EXISTS seq_nx05_ar_reminder_log_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_ar_reminder_log_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ARRM' || LPAD(nextval('seq_nx05_ar_reminder_log_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE "nx05_ar_reminder_log" (
  "id"            VARCHAR(15) NOT NULL DEFAULT gen_nx05_ar_reminder_log_id(),
  "tenant_id"     VARCHAR(15) NOT NULL,
  "ar_id"         VARCHAR(15) NOT NULL,
  "reminded_at"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reminded_by"   VARCHAR(15) NOT NULL,
  "remark"        VARCHAR(500),
  "created_at"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_nx05_ar_reminder_log" PRIMARY KEY ("id"),
  CONSTRAINT "fk_nx05_ar_reminder_log_tenant"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id"),
  CONSTRAINT "fk_nx05_ar_reminder_log_ar"
    FOREIGN KEY ("ar_id") REFERENCES "nx05_ar_ledger"("id"),
  CONSTRAINT "fk_nx05_ar_reminder_log_user"
    FOREIGN KEY ("reminded_by") REFERENCES "nx01_user"("id")
);

CREATE INDEX "idx_nx05_ar_reminder_log_tenant" ON "nx05_ar_reminder_log" ("tenant_id");
CREATE INDEX "idx_nx05_ar_reminder_log_ar" ON "nx05_ar_reminder_log" ("ar_id");
CREATE INDEX "idx_nx05_ar_reminder_log_remindedAt" ON "nx05_ar_reminder_log" ("reminded_at");

COMMENT ON TABLE "nx05_ar_reminder_log" IS
  '應收帳款催款歷史記錄（純內部、不寄 email/簡訊）。對齊階段 F P5 意圖書 E + Alex Q2=2a';

-- ============================================================
-- §3. nx02_warranty_claim 加 refund_amount + refund_method
-- ============================================================
-- 業務語意（總經理 2026-06-01 拍板）：
--   - refund_amount：退錢金額、系統帶建議值 = 進貨成本 × qty、業務可手動改
--   - refund_method 三選一（result='REF' 退錢時填）：
--       O = Offset    下次付款扣抵（沖減該廠商 ApLedger 餘額）
--       A = Allowance 開折讓單（走既有 Allowance 折讓流程、含主管核可）
--       R = Refund    直接匯款退現（沖該筆 ApLedger）
--   - result != 'REF' 時兩欄為 NULL（換新 NEW / 維修後還 RPR / 駁回 REJ 不退錢）

ALTER TABLE "nx02_warranty_claim"
  ADD COLUMN "refund_amount" DECIMAL(14, 2),
  ADD COLUMN "refund_method" VARCHAR(1);

COMMENT ON COLUMN "nx02_warranty_claim"."refund_amount" IS
  '退錢金額（result=REF 時填）。系統建議值 = 進貨成本 × qty、業務可手動改。其他 result 為 null';
COMMENT ON COLUMN "nx02_warranty_claim"."refund_method" IS
  '退錢方式（result=REF 時必填）：O=Offset 下次扣抵 / A=Allowance 折讓單 / R=Refund 直接退現';

-- ============================================================
-- 回滾段（手動 revert、注意新表資料會孤立）
-- ============================================================
--
-- -- nx02_warranty_claim
-- ALTER TABLE "nx02_warranty_claim"
--   DROP COLUMN "refund_amount",
--   DROP COLUMN "refund_method";
--
-- -- nx05_ar_reminder_log（先 DROP TABLE 再 SEQUENCE）
-- DROP TABLE IF EXISTS "nx05_ar_reminder_log";
-- DROP SEQUENCE IF EXISTS "seq_nx05_ar_reminder_log_id";
-- DROP FUNCTION IF EXISTS gen_nx05_ar_reminder_log_id();
--
-- -- nx05_paylog_settlement
-- DROP TABLE IF EXISTS "nx05_paylog_settlement";
-- DROP SEQUENCE IF EXISTS "seq_nx05_paylog_settlement_id";
-- DROP FUNCTION IF EXISTS gen_nx05_paylog_settlement_id();
