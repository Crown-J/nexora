-- ============================================================
-- B. 零件重做（schema 部分）：
--   · nx01_part 新增 old_code（舊料號）、cost（成本）
--   · 新增 nx01_part_oem_code（正廠對應料號子表，一零件多正廠料號）
-- 純加（additive），不動既有資料。
-- ============================================================

-- gen id 函式（新表 nx01_part_oem_code）
CREATE SEQUENCE IF NOT EXISTS seq_nx01_part_oem_code_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_oem_code_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01POEM' || LPAD(nextval('seq_nx01_part_oem_code_id')::text, 7, '0');
$$ LANGUAGE sql;

-- AlterTable
ALTER TABLE "nx01_part" ADD COLUMN IF NOT EXISTS "cost" DECIMAL(14,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "old_code" VARCHAR(50);

-- CreateTable
CREATE TABLE IF NOT EXISTS "nx01_part_oem_code" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_oem_code_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_brand_id" VARCHAR(15),
    "oem_code" VARCHAR(50) NOT NULL,
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx01_part_oem_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "nx01_part_oem_code_tenant_id_oem_code_idx" ON "nx01_part_oem_code"("tenant_id", "oem_code");
CREATE INDEX IF NOT EXISTS "nx01_part_oem_code_part_id_idx" ON "nx01_part_oem_code"("part_id");

-- AddForeignKey
ALTER TABLE "nx01_part_oem_code" DROP CONSTRAINT IF EXISTS "nx01_part_oem_code_part_id_fkey";
ALTER TABLE "nx01_part_oem_code" ADD CONSTRAINT "nx01_part_oem_code_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
