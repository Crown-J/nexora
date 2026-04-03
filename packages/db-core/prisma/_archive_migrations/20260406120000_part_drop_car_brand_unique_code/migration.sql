-- Part master: drop car_brand_id on nx00_part; unique on code only.
-- Clears nx00_part and all FK-dependent rows (user re-imports master data).

TRUNCATE TABLE "nx00_part" CASCADE;

ALTER TABLE "nx00_part" DROP CONSTRAINT IF EXISTS "nx00_part_car_brand_id_fkey";

DROP INDEX IF EXISTS "nx00_part_car_brand_id_idx";

-- 複合唯一為 UNIQUE INDEX（非 TABLE CONSTRAINT）
DROP INDEX IF EXISTS "nx00_part_code_car_brand_id_key";

ALTER TABLE "nx00_part" DROP COLUMN IF EXISTS "car_brand_id";

CREATE UNIQUE INDEX IF NOT EXISTS "nx00_part_code_key" ON "nx00_part"("code");
