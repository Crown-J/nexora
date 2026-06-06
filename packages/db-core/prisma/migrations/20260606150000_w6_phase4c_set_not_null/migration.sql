-- packages/db-core/prisma/migrations/20260606150000_w6_phase4c_set_not_null/migration.sql
-- W6 [3-8] Phase 4c 2026-06-06：brand_id SET NOT NULL（model + brand_code_rule）
--
-- 前置條件：phase4-pre 已驗證 0 null
--   - nx01_model.brand_id: 0 null（W6 Phase 1 已 backfill）
--   - nx01_brand_code_rule.brand_id: 0 null（W6-切換軌 dual-write 已對齊）
--
-- 對齊舊 schema：原 nx01_model.car_brand_id / nx01_brand_code_rule.part_brand_id 為 NOT NULL
-- 改 brand_id 為 NOT NULL 後、phase 5 才能 drop 舊欄位

ALTER TABLE "nx01_model" ALTER COLUMN "brand_id" SET NOT NULL;
ALTER TABLE "nx01_brand_code_rule" ALTER COLUMN "brand_id" SET NOT NULL;
