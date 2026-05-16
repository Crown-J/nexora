-- packages/db-core/prisma/migrations/20260516150000_ar_impl_01_m1_part_stock_setting_ar_columns/migration.sql
-- ============================================================================
-- Migration: ar_impl_01_m1_part_stock_setting_ar_columns
-- 建立日期：2026-05-16
-- 任務：TASK-AR-IMPL-01 Phase 1 M1（自動補貨 AR 配套欄、PartStockSetting +3 欄）
-- 對應 plan：docs/auto-replenish/spec/impl/ar-impl-01-plan.md §3 M1
-- 對應 overview：docs/auto-replenish/spec/intent/ar-overview.md §4 倉層級彈性頻率
-- 對應拍板：
--   - Crown Q-AR2 倉層級彈性頻率（每倉自訂）
--   - Crown Q-B2 升級倉層級彈性窗口、預設 90 天
--
-- 範圍（A041 = 3 ALTER TABLE ADD COLUMN、純加欄、無 FK）：
--   1. calculation_frequency    INT NULL  天數、null=每天、scheduler 用
--   2. last_calculated_at        TIMESTAMP(3) NULL  最後 AR 計算時間、scheduler 用
--   3. calculation_window_days   INT NULL  平均出貨計算窗口、null=預設 90 天
--
-- 業務語意：
--   - calculation_frequency：scheduler 按倉判定多久該跑一次（每天 / 每週 / 每月）
--   - last_calculated_at：scheduler 比較「now - lastCalculatedAt >= frequency」才跑
--   - calculation_window_days：算平均出貨量時、撈 ledger 的時間範圍（30/60/90 天）
--
-- 漸進範式：
--   - 既有 row 全 null、scheduler 套預設值（frequency=null→每天、windowDays=null→90 天）
--   - 不影響既有 LITE/PLUS service 行為
--   - 屬 PLUS 戰略級欄位（自動補貨在 PLUS 起）
--
-- 風險：低（純加欄、nullable、無 default constraint 變更）
-- ============================================================================

ALTER TABLE "nx03_part_stock_setting" ADD COLUMN "calculation_frequency"    INTEGER;
ALTER TABLE "nx03_part_stock_setting" ADD COLUMN "last_calculated_at"       TIMESTAMP(3);
ALTER TABLE "nx03_part_stock_setting" ADD COLUMN "calculation_window_days"  INTEGER;

-- ============================================================================
-- 完成：PartStockSetting +3 AR 配套欄
-- 後續：M2 BrandAllocationRule 新表
-- ============================================================================
