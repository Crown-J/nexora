-- ============================================================
-- 收尾補強：據點 / 倉庫 3 個 drift 一次補齊（併 1 支、原子性 + 內聚好維護）
--   drift 1：warehouse.site_id 改 NN + 真 FK（onDelete RESTRICT）
--   drift 2：site 加結構化地址欄位 city_id/district_id/street_id（scalar、#23 並存、legacy address 保留）
--   drift 3：site 加 is_main + partial unique（每 tenant 一筆主據點，對齊 warehouse.is_main 範式）
-- 全程冪等可重跑。
-- ============================================================

-- drift 2 + 3：site 新增欄位（先加、後續 backfill 需要 is_main 欄）
ALTER TABLE "nx01_site"
  ADD COLUMN IF NOT EXISTS "city_id" VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "district_id" VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "street_id" VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "is_main" BOOLEAN NOT NULL DEFAULT false;

-- drift 3：每租戶第一筆 site（sort_no 最小）設 is_main=true
WITH first_site AS (
  SELECT DISTINCT ON ("tenant_id") "id"
  FROM "nx01_site"
  ORDER BY "tenant_id", "sort_no" ASC, "code" ASC
)
UPDATE "nx01_site" SET "is_main" = true WHERE "id" IN (SELECT "id" FROM first_site);

-- drift 3：partial unique（同 tenant 只 1 筆 is_main=true、業務 invariant）
CREATE UNIQUE INDEX IF NOT EXISTS "nx01_site_tenant_id_is_main_unique"
ON "nx01_site"("tenant_id")
WHERE "is_main" = true;

-- drift 1：防禦性 backfill 任何 NULL warehouse.site_id → 該租戶主據點（避免 SET NOT NULL 失敗）
UPDATE "nx01_warehouse" w SET "site_id" = (
  SELECT s."id" FROM "nx01_site" s
  WHERE s."tenant_id" = w."tenant_id"
  ORDER BY s."is_main" DESC, s."sort_no" ASC, s."code" ASC
  LIMIT 1
) WHERE "site_id" IS NULL;

-- drift 1：warehouse.site_id NN + 真 FK（onDelete RESTRICT）
ALTER TABLE "nx01_warehouse" ALTER COLUMN "site_id" SET NOT NULL;
ALTER TABLE "nx01_warehouse" DROP CONSTRAINT IF EXISTS "nx01_warehouse_site_id_fkey";
ALTER TABLE "nx01_warehouse" ADD CONSTRAINT "nx01_warehouse_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "nx01_site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
