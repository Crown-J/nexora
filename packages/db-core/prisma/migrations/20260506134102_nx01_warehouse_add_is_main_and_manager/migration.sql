-- TASK-PHASE2-NX01-WAREHOUSE-SCHEMA-EXTEND-01
-- nx01_warehouse 補建：is_main + manager_user_id（NX01-06 規格書 v1.1）
--
-- 變更：
--   1. ADD COLUMN is_main BOOLEAN NOT NULL DEFAULT false
--   2. ADD COLUMN manager_user_id VARCHAR(15) NULL（FK to nx01_user、ON DELETE SET NULL）
--   3. CREATE PARTIAL UNIQUE INDEX (tenant_id) WHERE is_main = true
--      → 同 tenant 只 1 筆 is_main=true、強制業務 invariant
--   4. backfill：既有 dev/prod 倉庫資料、每 tenant 第一筆（sort_no 最小）設 is_main=true
--      → LITE/PLUS/PRO 既有 seed 都對齊「第一筆主倉」業務語意

-- AlterTable
ALTER TABLE "nx01_warehouse"
ADD COLUMN "is_main" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "manager_user_id" VARCHAR(15);

-- AddForeignKey
ALTER TABLE "nx01_warehouse"
ADD CONSTRAINT "nx01_warehouse_manager_user_id_fkey"
FOREIGN KEY ("manager_user_id") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index（同 tenant 只 1 筆 is_main=true、業務 invariant 強制）
CREATE UNIQUE INDEX "nx01_warehouse_tenant_id_is_main_unique"
ON "nx01_warehouse"("tenant_id")
WHERE "is_main" = true;

-- Backfill：每個 tenant 的第一筆倉庫（sort_no 最小）設 is_main=true
-- LITE: 唯一倉、預期 MW1 → is_main=true
-- PLUS: 既有 MW1+BW1、預期 MW1 → is_main=true
-- PRO: 既有 HW1+MW1+BW1~4、預期 HW1 sort_no=1 → is_main=true
WITH first_warehouse AS (
  SELECT DISTINCT ON ("tenant_id") "id"
  FROM "nx01_warehouse"
  ORDER BY "tenant_id", "sort_no" ASC, "id" ASC
)
UPDATE "nx01_warehouse"
SET "is_main" = true
WHERE "id" IN (SELECT "id" FROM first_warehouse);
