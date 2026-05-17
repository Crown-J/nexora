-- packages/db-core/prisma/migrations/20260518310000_nx06_impl_01_m2_dn_printer_lalamove_columns/migration.sql
-- ============================================================================
-- Migration: nx06_impl_01_m2_dn_printer_lalamove_columns
-- 建立日期：2026-05-18
-- 任務：TASK-NX06-IMPL-01 Phase 1 M2（熱感印表機 + Lalamove 整合配套）
-- 對應 plan：docs/nx06/spec/impl/nx06-impl-01-plan.md §3 M2
-- 對應 overview：docs/nx06/spec/intent/nx06-overview.md §6.2 + §3.1 #9
-- 對應拍板：
--   - Crown Q7=a 現場熱感印表機列印（藍牙 Bluetooth）
--   - Crown Q6=b Lalamove API 半自動整合
--   - Crown Q-RHYTHM-2 全自主、Hank 自跑
--
-- 範圍（A041 = 5 ALTER TABLE ADD COLUMN、純加欄、全 nullable）：
--   熱感印表機 2 欄：
--     1. printer_device_id           VARCHAR(50) NULL（藍牙印表機裝置 ID、外務 App 配對）
--     2. printed_at                  TIMESTAMP(3) NULL（列印時間追蹤）
--   Lalamove 整合 3 欄：
--     3. lalamove_order_id           VARCHAR(50) NULL（Lalamove API 訂單 ID）
--     4. lalamove_tracking_no        VARCHAR(50) NULL（追蹤碼）
--     5. lalamove_callback_status    VARCHAR(30) NULL（最新 webhook 狀態）
--
-- 業務語意：
--   - 熱感印表機：外務員手機 App 藍牙配對印表機、現場印簽收單、寫 printer_device_id + printed_at
--   - Lalamove API：partner_type='T' 外包配送、Lalamove API 回傳 order_id + tracking_no、webhook 更新 callback_status
--   - lalamove_callback_status enum：PENDING / ASSIGNING / PICKED_UP / COMPLETED / CANCELLED
--   - 對應 service：PrinterIntegrationService + LalamoveIntegrationService（Phase 2 新建）
--
-- 漸進範式：
--   - 既有 row 全 null（純自家配送、無外部整合）
--   - 後續 Lalamove API call 啟動時 application 寫入（環境變數 LALAMOVE_API_ENABLED 控制）
--   - 後續熱感印表機觸發時前端 mobile App 寫入（藍牙 SDK 對接屬 UI 軌）
--
-- 風險：低（純加欄、全 nullable、無 backfill）
-- ============================================================================

ALTER TABLE "nx06_dn" ADD COLUMN "printer_device_id"        VARCHAR(50);
ALTER TABLE "nx06_dn" ADD COLUMN "printed_at"               TIMESTAMP(3);
ALTER TABLE "nx06_dn" ADD COLUMN "lalamove_order_id"        VARCHAR(50);
ALTER TABLE "nx06_dn" ADD COLUMN "lalamove_tracking_no"     VARCHAR(50);
ALTER TABLE "nx06_dn" ADD COLUMN "lalamove_callback_status" VARCHAR(30);

-- ============================================================================
-- 完成：Nx06Dn +5 配套欄（熱感印表機 2 + Lalamove 3）
-- 後續：Phase 2 L1 新建 3 service（Dispatch / PrinterIntegration / LalamoveIntegration）
-- ============================================================================
