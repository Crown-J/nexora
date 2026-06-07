-- packages/db-core/prisma/migrations/20260607020000_t1_role_level_dept_user_unlock/migration.sql
-- 02 第三批 T1 2026-06-07：職務層級 + 隸屬部門 + user.departmentId 解綁版本
--
-- 1. nx01_role 加 level（層級、純文字、未來改 enum 也保留彈性）
-- 2. nx01_role 加 department_id（FK to nx01_department、職務隸屬部門）
-- 3. user.department_id 既有欄位、本軌只是「應用層解綁版本標記」、DB schema 無動作
--    （DB column 本就 LITE 可寫、版本綁定僅在 schema.prisma /// 註解 + zone metadata）
-- 全 nullable additive 冪等。

ALTER TABLE "nx01_role"
  ADD COLUMN IF NOT EXISTS "level"         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "department_id" VARCHAR(15);

-- FK to nx01_department（部門刪掉 → 職務 deptId 清空、不擋）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nx01_role_department_id_fkey'
  ) THEN
    ALTER TABLE "nx01_role"
      ADD CONSTRAINT "nx01_role_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "nx01_department" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
