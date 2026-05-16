-- packages/db-core/prisma/migrations/20260516130000_nx03_impl_01_m2_dynamic_stocktake_snapshot_delta/migration.sql
-- ============================================================================
-- Migration: nx03_impl_01_m2_dynamic_stocktake_snapshot_delta
-- 建立日期：2026-05-16
-- 任務：TASK-NX03-IMPL-01 Phase 1 M2（動態盤點 snapshot + delta、補做、順序回正）
-- 對應 plan：docs/nx03/spec/impl/nx03-impl-01-plan.md §3 M2
-- 對應 overview：docs/nx03/spec/intent/nx03-overview.md §3.3 #11（動態盤點戰略特色）
-- 對應拍板：
--   - Crown Q-B3=A：deltaQty application 層即時聚合 stock_ledger（不用 trigger、不凍結業務）
--   - Crown Q-S2=A：既有 systemQty 保留並存（漸進、不破壞既有 stocktake service）
--
-- 範圍（A041 = 6 ALTER TABLE ADD COLUMN、無 FK）：
--   1. nx03_stock_take.snapshot_started_at      TIMESTAMP(3) NULL
--   2. nx03_stock_take.snapshot_ended_at        TIMESTAMP(3) NULL
--   3. nx03_stock_take_item.snapshot_qty         DECIMAL(14,4) NOT NULL DEFAULT 0
--   4. nx03_stock_take_item.delta_qty            DECIMAL(14,4) NOT NULL DEFAULT 0
--   5. nx03_stock_take_item.formula_expected_qty DECIMAL(14,4) NOT NULL DEFAULT 0
--   6. nx03_stock_take_item.real_diff_qty        DECIMAL(14,4) NOT NULL DEFAULT 0
--
-- 業務語意（動態盤點流程）：
--   1. 盤點啟動 → 寫 snapshotStartedAt + 抓 balance.onHandQty 快照寫 snapshotQty
--   2. 期間照常進出貨（不影響業務、stock_ledger 持續寫入）
--   3. 盤點完成 → 寫 snapshotEndedAt
--      deltaQty = SUM(ledger.qtyIn - qtyOut) WHERE part+warehouse+location
--                 AND movementDate BETWEEN snapshotStartedAt AND snapshotEndedAt
--      formulaExpectedQty = snapshotQty + deltaQty
--      realDiffQty = countedQty - formulaExpectedQty
--   4. realDiffQty ≠ 0 才寫 ledger source=T 帳（誤差才寫、避免冗筆）
--
-- 漸進範式（Q-S2=A）：
--   - 既有 systemQty 欄保留（語意 = 盤點當下抓 balance.onHandQty 快照、跟 snapshotQty 相同概念）
--   - 既有 diffQty/diffCost 欄保留（語意 = countedQty - systemQty、跟 realDiffQty 用 formulaExpectedQty 不同）
--   - 既有 stocktake service 不破壞、新 service 升級走 snapshotQty/deltaQty/formulaExpectedQty/realDiffQty 路徑
--
-- 風險：低（純加欄、有 default、無 FK、無 backfill）
-- ============================================================================

-- ============================================================================
-- 1. nx03_stock_take：加 snapshot 時間範圍
-- ============================================================================

ALTER TABLE "nx03_stock_take" ADD COLUMN "snapshot_started_at" TIMESTAMP(3);
ALTER TABLE "nx03_stock_take" ADD COLUMN "snapshot_ended_at"   TIMESTAMP(3);

-- ============================================================================
-- 2. nx03_stock_take_item：加 snapshot/delta/formula/realDiff 4 欄
-- ============================================================================

ALTER TABLE "nx03_stock_take_item" ADD COLUMN "snapshot_qty"         DECIMAL(14, 4) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_stock_take_item" ADD COLUMN "delta_qty"            DECIMAL(14, 4) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_stock_take_item" ADD COLUMN "formula_expected_qty" DECIMAL(14, 4) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_stock_take_item" ADD COLUMN "real_diff_qty"        DECIMAL(14, 4) NOT NULL DEFAULT 0;

-- ============================================================================
-- 完成：動態盤點 snapshot + delta 6 欄落地
-- 後續：L2 stocktake service 升級走新欄路徑、application 層 deltaQty 即時聚合 query
-- ============================================================================
