-- packages/db-core/prisma/migrations/20260421152710_fix_schema_drift/migration.sql
-- ============================================================================
-- Migration: fix_schema_drift
-- 建立日期：2026-04-21
-- 任務：TASK-SCHEMA-DRIFT-FIX-01
--
-- 目的：
--   同步 schema.prisma 與 DB 之間的 8 處 drift（一次性收斂）。
--
-- 類型 A：4 個 Index（DB 對 → 補進 schema）
--   DB 已存在這 4 個 (tenant_id, 業務欄位) 的效能索引，但 schema 沒有對應
--   @@index。本 SQL 用 CREATE INDEX IF NOT EXISTS 形式，對現有 DB 是 no-op，
--   但讓新環境重建 DB 時能正確建立。schema.prisma 同步新增 @@index 並以
--   map: 指定索引名稱（避免 Prisma 預設命名與 DB 現有名稱不一致）。
--
-- 類型 B：4 個 Status Default（Schema 對 → DB 實際改值）
--   舊 DB default 為單字元代碼（'N'/'P'/'D'），但 schema 定義為長字串
--   （'NORMAL'/'DRAFT'），業務代碼（nx07 attendance/leave/overtime/payroll
--   service）全部顯式 status: 'NORMAL'|'DRAFT'|'CANCELLED'|'VOIDED'，
--   從不使用單字元。silent mismatch（未來如有 create() 漏給 status 會產生
--   孤魂資料）已登記為架構債 A002。本 migration 修正 DB default 與 schema
--   一致。
--
-- 風險評估：
--   A 類：0 風險（IF NOT EXISTS 保護）
--   B 類：0 風險（業務代碼從未依賴舊 default，現有 row 既有 status 值不受
--         影響；只影響未來沒顯式帶 status 的 INSERT）
--
-- 追蹤：
--   - A002（silent default mismatch）← 本 migration 消除
-- ============================================================================

-- === 類型 A：CREATE INDEX IF NOT EXISTS ===
-- 這些 index DB 已存在，此 SQL 對現有 DB 是 no-op
-- 目的：讓 schema.prisma 與 DB 同步，避免未來 drift

CREATE INDEX IF NOT EXISTS "nx06_dn_source_so_idx"
  ON "nx06_dn" ("tenant_id", "source_so_id");

CREATE INDEX IF NOT EXISTS "nx06_dn_source_sr_idx"
  ON "nx06_dn" ("tenant_id", "source_sr_id");

CREATE INDEX IF NOT EXISTS "nx06_dn_tenant_logistics_idx"
  ON "nx06_dn" ("tenant_id", "logistics_type");

CREATE INDEX IF NOT EXISTS "nx10_checkin_log_tenant_id_user_id_idx"
  ON "nx10_checkin_log" ("tenant_id", "user_id");

-- === 類型 B：ALTER TABLE SET DEFAULT ===
-- DB 舊 default 是單字元代碼，業務從未使用；
-- 修正為與 schema 一致的長字串。

ALTER TABLE "nx07_attendance"
  ALTER COLUMN "status" SET DEFAULT 'NORMAL';

ALTER TABLE "nx07_leave_request"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "nx07_overtime_request"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "nx07_salary_record"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';
