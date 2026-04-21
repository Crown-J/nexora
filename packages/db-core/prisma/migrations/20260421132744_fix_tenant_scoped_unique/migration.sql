-- packages/db-core/prisma/migrations/20260421132744_fix_tenant_scoped_unique/migration.sql
-- ============================================================================
-- Migration: fix_tenant_scoped_unique
-- 建立日期：2026-04-21
-- 任務：TASK-SEED-REFACTOR-01 Step 3 Phase 1
--
-- 目的：
--   修正 4 個有 tenantId 欄位但 unique 索引未包含 tenantId 的表。
--   從「全域 code」改為「(tenantId, code)」或「(tenantId, levelCode)」。
--
-- 動機：
--   Multi-tenancy 下第二個租戶 apply template 會撞舊全域 unique，
--   未來 SYS-W01 真實客戶上線時會直接爆。在 DEV 階段修掉是最小風險。
--
-- 影響：
--   - nx01_car_brand:    @@unique([code])      → @@unique([tenantId, code])
--   - nx01_part_group:   @@unique([code])      → @@unique([tenantId, code])
--   - nx05_account_code: @@unique([code])      → @@unique([tenantId, code])
--   - nx10_medal_level:  @@unique([levelCode]) → @@unique([tenantId, levelCode])
--
-- 業務代碼影響：0（apps/ 所有 query 已正確帶 tenantId）
-- 資料衝突風險：0（現有資料全在單一租戶下，不可能撞新 unique）
-- 執行方式：手寫 SQL + psql 執行 + prisma migrate resolve --applied
--           （改用 prisma migrate dev --create-only 會把 8 處 schema drift 一起包進來）
-- ============================================================================

-- DropIndex
DROP INDEX "nx01_car_brand_code_key";
DROP INDEX "nx01_part_group_code_key";
DROP INDEX "nx05_account_code_code_key";
DROP INDEX "nx10_medal_level_level_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "nx01_car_brand_tenant_id_code_key"        ON "nx01_car_brand"   ("tenant_id", "code");
CREATE UNIQUE INDEX "nx01_part_group_tenant_id_code_key"       ON "nx01_part_group"  ("tenant_id", "code");
CREATE UNIQUE INDEX "nx05_account_code_tenant_id_code_key"     ON "nx05_account_code"("tenant_id", "code");
CREATE UNIQUE INDEX "nx10_medal_level_tenant_id_level_code_key" ON "nx10_medal_level" ("tenant_id", "level_code");
