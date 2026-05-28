-- TASK-NX01-PARTNER-SIX-CLASSES-01
-- 階段 0：partner_type 六分類改制 + 加 can_transfer_stock 旗標
--
-- 對應藍圖：階段 0 partner 改制（NEXORA LITE 版開發藍圖 §4）
-- 設計拍板：Crown 2026-05-28
--   六分類：C=保養廠 / O=同行 / S=供應商 / T=外包物流 / B=銀行 / V=一般廠商
--   同行用獨立代號 O（不是 C+flag）；旗標 can_transfer_stock 處理少數「保養廠偶爾調貨」彈性
--   客戶選單篩選 = partner_type IN ('C', 'O')
--   供應商選單篩選 = partner_type='S' only（O 不進）
--   調貨對象篩選 = partner_type='O' OR can_transfer_stock=true
--   保養廠+同行都走 ABCD 定價（customer_grade_id 註解放寬）
--
-- 變更摘要：
--   1. ADD COLUMN nx01_partner.can_transfer_stock BOOLEAN NOT NULL DEFAULT false
--      （對齊 can_* 範式、role-view can_read/create/update/delete/export 同源）
--   2. 防禦性 backfill：清除歷史 CUST / SUP 殘碼（seed 0 筆、prod 防禦）
--      （BOTH 已於 20260505060156 處理過、但保險再跑一次）
--   3. COMMENT ON COLUMN 收斂註解（partner_type / customer_grade_id 對齊新六分類）
--
-- ⚠️ 不在本 migration 處理（另軌 application 層 commit）：
--   - 補 seed CSV 同行 O / 外包物流 T / 一般廠商 V 範例資料（走 seed-data CSV、不走 migration）
--   - schema.prisma 註解收斂 + canTransferStock 欄位定義（純 declarative、不影響 runtime）
--   - service / DTO / UI 層 partner_type 過濾邏輯（影響 18 個 source files）
--
-- 對齊架構債：
--   A031（partner_type default 'BOTH' → 'C' 已套用）+ 本軌進一步收斂 CUST/SUP 殘碼
--   schema.prisma 註解 drift（line 1614 / 1916 / 1960 / 2279）—— 純文件、非 SQL 範圍
--
-- Rollback（手動）：
--   1. ALTER TABLE nx01_partner DROP COLUMN can_transfer_stock;
--   2. COMMENT 復原須查 git history
--   3. backfill 無法精準 rollback（CUST/SUP/BOTH 原值已遺失、不影響系統運作）

-- ─────────────────────────────────────────────────────────────
-- 1. 新增 can_transfer_stock 欄位（並存階段）
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "nx01_partner"
  ADD COLUMN "can_transfer_stock" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "nx01_partner"."can_transfer_stock"
  IS '可調貨旗標。partner_type=O 同行業務上預設 true（service 層 create 時帶入）；partner_type=C 保養廠預設 false、少數保養廠偶爾調貨時可手動開啟。調貨對象清單 = WHERE partner_type=''O'' OR can_transfer_stock=true。對齊 can_* 範式。';

-- ─────────────────────────────────────────────────────────────
-- 2. 防禦性 backfill：清舊枚舉殘碼（seed 0 筆、prod 防禦）
-- ─────────────────────────────────────────────────────────────
-- 註：BOTH 已於 20260505060156 修正、本軌保險再跑（idempotent）
UPDATE "nx01_partner" SET "partner_type" = 'C' WHERE "partner_type" = 'BOTH';

-- CUST 舊客戶碼 → C 保養廠
UPDATE "nx01_partner" SET "partner_type" = 'C' WHERE "partner_type" = 'CUST';

-- SUP 舊供應商碼 → S 供應商
UPDATE "nx01_partner" SET "partner_type" = 'S' WHERE "partner_type" = 'SUP';

-- ─────────────────────────────────────────────────────────────
-- 3. 收斂 partner_type 欄位註解（對齊新六分類）
-- ─────────────────────────────────────────────────────────────
COMMENT ON COLUMN "nx01_partner"."partner_type"
  IS '角色類型六分類：C=保養廠（純買方、ABCD 定價、應收）/ O=同行（雙向買+調貨、ABCD 定價、應收+應付軋帳、預設 can_transfer_stock=true）/ S=供應商（純賣方正規來源、採購比價/補貨對象、應付）/ T=外包物流 / B=銀行 / V=一般廠商。Application 層 enum、不在 DB 強制（Crown Q-PP-2=a）。';

-- ─────────────────────────────────────────────────────────────
-- 4. 放寬 customer_grade_id 註解（C + O 通用）
-- ─────────────────────────────────────────────────────────────
COMMENT ON COLUMN "nx01_partner"."customer_grade_id"
  IS '客戶等級ID（FK nx01_customer_grade），供報價單定價邏輯使用。partner_type IN (''C'', ''O'') 通用（保養廠+同行都走 ABCD 定價、業界 muscle memory：同行看交情/量、保養廠看消費力）。';
