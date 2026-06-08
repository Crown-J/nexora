-- packages/db-core/prisma/migrations/20260608040000_f1_so_special_price_flag/migration.sql
-- F1 特價售出第 6 處置 2026-06-08：Nx04So 加 specialPriceFlag、配合 IssueReport dispositionType='X'
--
-- 業務語意（總經理拍板三點）：
--   ① 借用一般銷貨單 + 特價旗標（不開新表）
--   ② 成本用原平均（COGS 走 avgCost、不改）
--   ③ 不走折讓、直接特價（單價=特價、自動定價子系統留 NX05）
--
-- 異常處置流程：
--   IR.dispose(dispositionType='X')
--     → 建 Nx04So（specialPriceFlag=true、待業務手動填特價 unitPrice）
--     → IR.relatedDocId 回填該 So.id
--     → 庫存：出庫 source=O（同一般銷貨）
--     → 財務：走 NX05 應收（同一般銷貨範式）
--
-- DispositionType enum 'X' 加在 dto 層（VARCHAR(1)、不需動 DB constraint）。
-- 既有資料 specialPriceFlag default false、無遷移風險。
--
-- 備份：dev-backups/pre-f1-special-sale_20260608_030000.sql (1.2MB)
-- 全 additive、三版本一致（LITE-CORE）。

ALTER TABLE "nx04_so"
  ADD COLUMN "special_price_flag" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "nx04_so_special_price_flag_idx" ON "nx04_so" ("special_price_flag");
