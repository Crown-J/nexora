-- packages/db-core/prisma/migrations/20260606170000_b_user_5_basic_fields/migration.sql
-- 02 對齊第二批 B 軌 2026-06-06：員工 basic zone 補 5 欄位（NX-MANUAL-02 v2.0 §補）
--
-- 補的欄位（basic zone、不動 PRO hr zone）：
--   1. highest_education  最高學歷（文字、未來下拉 enum）
--   2. graduate_school    畢業學校
--   3. military_service   服兵役（文字、未來下拉 enum）
--   4. health_check_date  體檢日期
--   5. health_check_result 體檢是否合格（文字、保留複檢/未體檢等延伸彈性）
--
-- 全 nullable additive、ADD COLUMN IF NOT EXISTS 冪等可重跑。

ALTER TABLE "nx01_user"
  ADD COLUMN IF NOT EXISTS "highest_education"   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "graduate_school"     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "military_service"    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "health_check_date"   DATE,
  ADD COLUMN IF NOT EXISTS "health_check_result" VARCHAR(20);
