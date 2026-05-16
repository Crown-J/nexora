-- packages/db-core/prisma/migrations/20260516100000_nx03_impl_01_m1_part_version_snapshot_columns/migration.sql
-- ============================================================================
-- Migration: nx03_impl_01_m1_part_version_snapshot_columns
-- 建立日期：2026-05-16
-- 任務：TASK-NX03-IMPL-01 Phase 1 M1（part_version snapshot 配套）
-- 對應 plan：docs/nx03/spec/impl/nx03-impl-01-plan.md §3 M1
-- 對應 audit：docs/nx03/nx03-audit-04.md B2 + B6
-- 對應 overview：docs/nx03/spec/intent/nx03-overview.md §9（重塑核心配套）
--
-- 範圍（A041 = 4 表加欄 + 4 FK）：
--   1. nx03_stock_ledger.part_version_id  VARCHAR(15) NULL  FK → nx01_part_version(id)
--   2. nx03_init_item.part_version_id     VARCHAR(15) NULL  FK → nx01_part_version(id)
--   3. nx03_st_item.part_version_id       VARCHAR(15) NULL  FK → nx01_part_version(id)
--   4. nx03_stock_take_item.part_version_id VARCHAR(15) NULL FK → nx01_part_version(id)
--
-- ON DELETE SET NULL：part_version 若被刪、ledger 保留歷史 row（snapshot 字段已備援）
-- ON UPDATE CASCADE：part_version id 變動跟著（理論上不會變、留標準範式）
--
-- 回填策略（Crown Q-S1=B）：
--   - 既有歷史 row 全部留 NULL（透明 break、不動 production 歷史資料）
--   - 從 Day-2 起、helper（applyQtyInWithLedger / applyQtyOutWithLedger）帶入當下 partVersionId
--   - UI 顯示「歷史 ledger partVersion 空白」屬透明 break、不補回填
--
-- 風險：低（純加欄、nullable、無破壞）
-- ============================================================================

-- ============================================================================
-- 1. AlterTable: nx03_stock_ledger
-- ============================================================================

ALTER TABLE "nx03_stock_ledger" ADD COLUMN "part_version_id" VARCHAR(15);

ALTER TABLE "nx03_stock_ledger"
  ADD CONSTRAINT "nx03_stock_ledger_part_version_id_fkey"
  FOREIGN KEY ("part_version_id") REFERENCES "nx01_part_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 2. AlterTable: nx03_init_item
-- ============================================================================

ALTER TABLE "nx03_init_item" ADD COLUMN "part_version_id" VARCHAR(15);

ALTER TABLE "nx03_init_item"
  ADD CONSTRAINT "nx03_init_item_part_version_id_fkey"
  FOREIGN KEY ("part_version_id") REFERENCES "nx01_part_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 3. AlterTable: nx03_st_item
-- ============================================================================

ALTER TABLE "nx03_st_item" ADD COLUMN "part_version_id" VARCHAR(15);

ALTER TABLE "nx03_st_item"
  ADD CONSTRAINT "nx03_st_item_part_version_id_fkey"
  FOREIGN KEY ("part_version_id") REFERENCES "nx01_part_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 4. AlterTable: nx03_stock_take_item
-- ============================================================================

ALTER TABLE "nx03_stock_take_item" ADD COLUMN "part_version_id" VARCHAR(15);

ALTER TABLE "nx03_stock_take_item"
  ADD CONSTRAINT "nx03_stock_take_item_part_version_id_fkey"
  FOREIGN KEY ("part_version_id") REFERENCES "nx01_part_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 完成：4 表 part_version_id 欄落地、FK 接通
-- 後續：M3 Nx03Disposal / M4 Nx03Conversion 明細表設計時一併納入規範
-- ============================================================================
