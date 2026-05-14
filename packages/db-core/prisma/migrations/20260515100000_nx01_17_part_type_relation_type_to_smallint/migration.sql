-- packages/db-core/prisma/migrations/20260515100000_nx01_17_part_type_relation_type_to_smallint/migration.sql
-- ============================================================================
-- Migration: nx01_17_part_type_relation_type_to_smallint
-- 建立日期：2026-05-15
-- 任務：TASK-NX01-17-IMPL commit 1（軸 1 字母 enum 升 SmallInt、最小範圍）
-- 對應 spec：docs/nx01/spec/intent/nx01-17-part-version-relation.md v1.0
--
-- 範圍（Crown 拍 Q3=B-全面 + 範圍選項 A 最小）：
--   - nx01_part.type VARCHAR(1) → SmallInt
--   - nx01_part_relation.relation_type VARCHAR(1) → SmallInt
--   只 NX01-17 用到的 2 欄位、其餘 NX01 模組 7 個技術 enum 留 A069 後續軌
--   NX02~NX08 約 106 個技術 enum 留 A070 各模組規格書落地時順手升
--
-- 對應 enum mapping（A041 精確）：
--   part.type:
--     A 專用 → 1
--     B 通用 → 2
--     C 組合 → 3
--     D 拆解 → 4
--   part_relation.relation_type:
--     S 改號 → 1
--     R 同款 → 2
--     C 改版換周邊 → 3
--     B 組合包 → 4
--     F 拆解包 → 5
--
-- 對齊範式：NX01-14 fuelType / NX01-15 transmissionType（SmallInt + class-validator）
-- ============================================================================

-- ============================================================================
-- 1. nx01_part.type VARCHAR(1) → SmallInt（含 data 轉換）
-- ============================================================================

-- 暫時欄位
ALTER TABLE "nx01_part" ADD COLUMN "type_new" SMALLINT DEFAULT 1;

-- Data migration
UPDATE "nx01_part" SET "type_new" = CASE "type"
  WHEN 'A' THEN 1
  WHEN 'B' THEN 2
  WHEN 'C' THEN 3
  WHEN 'D' THEN 4
  ELSE 1  -- fallback to 專用型（既有 default）
END;

-- 切換
ALTER TABLE "nx01_part" DROP COLUMN "type";
ALTER TABLE "nx01_part" RENAME COLUMN "type_new" TO "type";

-- ============================================================================
-- 2. nx01_part_relation.relation_type VARCHAR(1) → SmallInt（含 data 轉換）
-- ============================================================================

ALTER TABLE "nx01_part_relation" ADD COLUMN "relation_type_new" SMALLINT;

UPDATE "nx01_part_relation" SET "relation_type_new" = CASE "relation_type"
  WHEN 'S' THEN 1
  WHEN 'R' THEN 2
  WHEN 'C' THEN 3
  WHEN 'B' THEN 4
  WHEN 'F' THEN 5
END;

ALTER TABLE "nx01_part_relation" DROP COLUMN "relation_type";
ALTER TABLE "nx01_part_relation" RENAME COLUMN "relation_type_new" TO "relation_type";
ALTER TABLE "nx01_part_relation" ALTER COLUMN "relation_type" SET NOT NULL;

-- ============================================================================
-- 完成：軸 1 字母 enum 升 SmallInt（最小範圍）
-- 後續軌（A069 / A070）：
--   - A069：NX01 模組其他 7 個技術 enum（partner.partnerType / partner.creditStatus /
--           part.returnPolicy / warehouse_type.code+flowMode / brand_code_rule.sourceCodePrefix）
--   - A070：NX02~NX08 約 106 個技術 enum（各模組規格書落地時順手升）
-- ============================================================================
