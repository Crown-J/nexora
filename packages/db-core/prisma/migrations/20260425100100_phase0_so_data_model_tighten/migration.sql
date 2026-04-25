-- packages/db-core/prisma/migrations/20260425100100_phase0_so_data_model_tighten/migration.sql
-- ============================================================================
-- Migration: phase0_so_data_model_tighten
-- 建立日期：2026-04-25
-- 任務：TASK-WP-PHASE0-SCHEMA-IMPL（C 方案 tighten 階段）
--
-- 目的：
--   把 nx02_ti_item / nx03_st_item 的 source_so_item_id 從 nullable 收成 NOT NULL。
--
-- 為什麼拆獨立 migration（採 C 方案的關鍵設計）：
--   1. 上一條 migration（20260425100000_phase0_so_data_model）只 ADD COLUMN nullable，
--      不留 sentinel 假值，避免 caller 讀到 '_BACKFILL_PEND_' 這類 schema-level
--      code smell。
--   2. Dev fresh 場景：兩張表此時皆為空表，SET NOT NULL 無 row 違反、瞬間通過。
--   3. Prod 上線場景：DBA 在 100000 跟 100100 之間插入針對 prod 真實資料設計的
--      backfill migration（推導 source_so_item_id 真實值或 orphan 標記），
--      跑完才走此 tighten。Hank/Alex/Crown 對焦結論（2026-04-25）。
--
-- 風險：
--   - Dev fresh：表為空，SET NOT NULL 無 row 違反 → ✅ 安全
--   - Prod 有資料且 NULL 未補：SET NOT NULL 會 raise → 必須先補 backfill
--     （這是設計要求，不是 bug）
-- ============================================================================

ALTER TABLE "nx02_ti_item"
    ALTER COLUMN "source_so_item_id" SET NOT NULL;

ALTER TABLE "nx03_st_item"
    ALTER COLUMN "source_so_item_id" SET NOT NULL;
