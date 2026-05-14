-- packages/db-core/prisma/migrations/20260514110000_nx01_part_add_unique_and_indexes/migration.sql
-- ============================================================================
-- Migration: nx01_part_add_unique_and_indexes
-- 建立日期：2026-05-14
-- 任務：TASK-NX01-05-IMPL commit 1（part schema 補 unique + 4 index）
-- 對應 spec：docs/nx01/spec/intent/nx01-05-part.md v1.0
--
-- 範圍：
--   1. ADD UNIQUE INDEX (tenant_id, code, country_id)
--      規格 Q3=A 拍板「同料號不同產地可並存」業務語意
--      schema line 707 doc comment 既有此設計、但未落地 constraint、本軌補
--   2. ADD INDEX × 4（規格 Q4=A 拍板）
--      - (tenant_id, code)：精確查料主場景（每天高頻、業務查料 #1）
--      - (tenant_id, name)：名稱搜尋（service contains 範式）
--      - (tenant_id, part_brand_id)：零件品牌篩選
--      - (tenant_id, part_group_id)：料件分類篩選
--
-- 技術備註：
--   - PostgreSQL 預設 NULLS DISTINCT（PG 15+）、country_id NULL 不算重複
--     業務含義：同 code 多個 NULL countryId 允許共存（產地未知）
--   - (tenant_id, code) 跟 unique (tenant_id, code, country_id) 有冗餘
--     PostgreSQL unique index 可服務 leftmost prefix lookup、但分開 index
--     有助 query planner 對純 code lookup 選最小 index、效能 marginal 提升
--     對齊 Crown Q4=A 明示「4 個 index」拍板
--
-- 風險評估：
--   - dev DB：既有 part 資料極少（測試 fixture）、加 unique 安全
--   - production 未部署、無風險
-- ============================================================================

CREATE UNIQUE INDEX "nx01_part_tenant_id_code_country_id_key"
  ON "nx01_part"("tenant_id", "code", "country_id");

CREATE INDEX "nx01_part_tenant_id_code_idx"
  ON "nx01_part"("tenant_id", "code");

CREATE INDEX "nx01_part_tenant_id_name_idx"
  ON "nx01_part"("tenant_id", "name");

CREATE INDEX "nx01_part_tenant_id_part_brand_id_idx"
  ON "nx01_part"("tenant_id", "part_brand_id");

CREATE INDEX "nx01_part_tenant_id_part_group_id_idx"
  ON "nx01_part"("tenant_id", "part_group_id");

-- ============================================================================
-- 完成：nx01_part schema 對齊 NX01-05 規格 v1.0 §3.1 PK / unique + §3.2 index
-- ============================================================================
