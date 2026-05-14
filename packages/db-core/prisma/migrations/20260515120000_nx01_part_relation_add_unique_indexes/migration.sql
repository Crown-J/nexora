-- packages/db-core/prisma/migrations/20260515120000_nx01_part_relation_add_unique_indexes/migration.sql
-- ============================================================================
-- Migration: nx01_part_relation_add_unique_indexes
-- 建立日期：2026-05-15
-- 任務：TASK-NX01-17-IMPL commit 3（part_relation 補 unique + 3 index、Q6=A）
--
-- 範圍：
--   - UNIQUE (tenant_id, part_id_from, part_id_to, relation_type)
--     業務上同 from + to + relationType 不該重複建（race condition 防護）
--   - 3 個 filter index：partIdFrom / partIdTo / relationType
--
-- 對齊 _shared/worklog 主題 8「unique constraint 漏寫黃金窗口」family 收斂
-- ============================================================================

CREATE UNIQUE INDEX "nx01_part_relation_tenant_id_part_id_from_part_id_to_rel_key"
  ON "nx01_part_relation"("tenant_id", "part_id_from", "part_id_to", "relation_type");

CREATE INDEX "nx01_part_relation_tenant_id_part_id_from_idx"
  ON "nx01_part_relation"("tenant_id", "part_id_from");

CREATE INDEX "nx01_part_relation_tenant_id_part_id_to_idx"
  ON "nx01_part_relation"("tenant_id", "part_id_to");

CREATE INDEX "nx01_part_relation_tenant_id_relation_type_idx"
  ON "nx01_part_relation"("tenant_id", "relation_type");

-- ============================================================================
-- 完成：part_relation 對齊規格 v1.0 §3.1 PK / unique + §3.2 index
-- ============================================================================
