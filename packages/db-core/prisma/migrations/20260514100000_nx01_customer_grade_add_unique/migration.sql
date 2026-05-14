-- packages/db-core/prisma/migrations/20260514100000_nx01_customer_grade_add_unique/migration.sql
-- ============================================================================
-- Migration: nx01_customer_grade_add_unique
-- 建立日期：2026-05-14
-- 任務：TASK-NX01-07-IMPL commit 1（補 customer_grade tenant-scoped unique）
-- 對應 spec：docs/nx01/spec/intent/nx01-07-base-catalog.md v1.0
--
-- 範圍：Hank §6.3 揭露 A 系列候選收斂
--   既有 nx01_customer_grade 跟同 tenant-scoped 表 drift（part_brand / part_group 都有 unique、
--   customer_grade 漏寫）— v7_baseline 黃金窗口遺漏、本軌補上。
--
-- 變更：
--   ADD UNIQUE INDEX (tenant_id, code) — 對齊 part_brand / part_group 範式
--
-- 風險評估：
--   - dev DB：既有 seed 是 A/B/C/D 每 tenant 4 筆、無重複、unique 加入安全
--   - production：本軌前 production 未部署、無風險
--   - 若未來 production 既有資料含重複、需先 cleanup duplicates 再加 unique
-- ============================================================================

CREATE UNIQUE INDEX "nx01_customer_grade_tenant_id_code_key"
  ON "nx01_customer_grade"("tenant_id", "code");

-- ============================================================================
-- 完成：nx01_customer_grade tenant-scoped unique 對齊 part_brand / part_group 範式
-- ============================================================================
