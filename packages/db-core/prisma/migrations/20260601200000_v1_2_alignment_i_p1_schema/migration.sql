-- v1.2 對齊軌 階段 I P1：schema 變動（2 項、additive only、NULL/DEFAULT 兼容）
-- 對應意圖書 §2 退貨→保固連線（Alex Q1=a 拍板、總經理 2026-06-01 STOP-1 等點頭）
--
-- 性質：⚠️ 含 ALTER TABLE ADD COLUMN（既有 row 影響 0）
-- 既有資料影響：
--   - nx02_pr.disposition_flag：NOT NULL DEFAULT 'G'、PG 11+ metadata-only 不掃表、既有 row 自動拿到 'G' (一般退)
--   - nx02_warranty_claim.source_pr_id / source_pr_item_id：純 nullable、既有 row = NULL
-- 回滾：附 down 段（最後）
--
-- ⚠️ STOP-1：本 migration **尚未 apply**（Alex 拍板：寫好 SQL → 白話報總經理 → 點頭後才 apply localhost、絕不打 Railway）

-- ============================================================
-- §1. nx02_pr：加 disposition_flag（退貨處置 G/B/W）
-- ============================================================
-- 業務語意：
--   - G = General 一般退（既有行為、走 ledger 沖庫存 source=R）
--   - B = Bad     壞品退（退掉但標記壞品、後續可走報廢/折讓）
--   - W = Warranty 走保固（service 層自動建 Nx02WarrantyClaim、進保固理賠流程）
-- 與既有 return_mode（F/P/A）的差異：
--   - return_mode = 退多少（全退/部分退/折讓不退）
--   - disposition_flag = 退的東西性質（一般/壞品/走保固）
--   兩維度可並存（譬如 部分退 P + 走保固 W）。

ALTER TABLE "nx02_pr"
  ADD COLUMN "disposition_flag" VARCHAR(1) NOT NULL DEFAULT 'G';

COMMENT ON COLUMN "nx02_pr"."disposition_flag" IS
  '退貨處置標記（G=一般退 / B=壞品退 / W=走保固）。W 觸發 service 自動建保固單';

-- ============================================================
-- §2. nx02_warranty_claim：加 source_pr_id + source_pr_item_id（追溯來源退貨）
-- ============================================================
-- 業務語意：
--   - source_pr_id / source_pr_item_id 在「退貨→保固」自動建單時回填
--   - 既有人工開單路徑（claimType=CUST 客訴 / SELF 自用）兩欄為 NULL
--   - 不加 FK 約束（避免 cross-module 強耦合、application 層自律 + 報表 JOIN）

ALTER TABLE "nx02_warranty_claim"
  ADD COLUMN "source_pr_id"      VARCHAR(15),
  ADD COLUMN "source_pr_item_id" VARCHAR(15);

COMMENT ON COLUMN "nx02_warranty_claim"."source_pr_id" IS
  '來源退貨單 ID（FK nx02_pr、退貨選走保固時自動回填、人工建單為 NULL）';
COMMENT ON COLUMN "nx02_warranty_claim"."source_pr_item_id" IS
  '來源退貨明細 ID（FK nx02_pr_item、對應具體 line item、便於追溯與報表 group）';

-- index 給後續軌查詢用（譬如「列出某 PR 衍生的所有保固單」）
CREATE INDEX IF NOT EXISTS "nx02_warranty_claim_source_pr_id_idx"
  ON "nx02_warranty_claim" ("tenant_id", "source_pr_id")
  WHERE "source_pr_id" IS NOT NULL;

-- ============================================================
-- 回滾段（手動 revert、若 apply 後又需 rollback 使用）
-- ============================================================
--
-- DROP INDEX IF EXISTS "nx02_warranty_claim_source_pr_id_idx";
--
-- ALTER TABLE "nx02_warranty_claim"
--   DROP COLUMN "source_pr_item_id",
--   DROP COLUMN "source_pr_id";
--
-- ALTER TABLE "nx02_pr"
--   DROP COLUMN "disposition_flag";
