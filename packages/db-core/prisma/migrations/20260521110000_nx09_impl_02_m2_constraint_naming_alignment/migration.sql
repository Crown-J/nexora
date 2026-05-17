-- packages/db-core/prisma/migrations/20260521110000_nx09_impl_02_m2_constraint_naming_alignment/migration.sql
-- NX09-IMPL-02 Phase 1 M2：M1 hand-written constraint 命名 → Prisma 預設範式對齊
-- 對齊：NX06-IMPL-02 M4 / NX07-IMPL-01 M2 / NX08-IMPL-01 M2 / NX09-IMPL-01 M3 既有 drift resolution 範式
-- 性質：純 constraint rename（drop + re-add）、0 data change、0 schema 行為改變
-- 觸發：M1 SQL 用 `_fkey` 命名、Prisma 預設用 `_id_fkey` 命名

-- DropForeignKey
ALTER TABLE "nx09_repair_sop" DROP CONSTRAINT "nx09_repair_sop_car_model_fkey";

-- DropForeignKey
ALTER TABLE "nx09_repair_sop" DROP CONSTRAINT "nx09_repair_sop_tenant_fkey";

-- DropForeignKey
ALTER TABLE "nx09_repair_sop_part_model" DROP CONSTRAINT "nx09_repair_sop_part_model_part_model_fkey";

-- DropForeignKey
ALTER TABLE "nx09_repair_sop_part_model" DROP CONSTRAINT "nx09_repair_sop_part_model_sop_fkey";

-- DropForeignKey
ALTER TABLE "nx09_vin_lookup" DROP CONSTRAINT "nx09_vin_lookup_car_brand_fkey";

-- DropForeignKey
ALTER TABLE "nx09_vin_lookup" DROP CONSTRAINT "nx09_vin_lookup_model_fkey";

-- DropForeignKey
ALTER TABLE "nx09_vin_lookup" DROP CONSTRAINT "nx09_vin_lookup_tenant_fkey";

-- AddForeignKey
ALTER TABLE "nx09_vin_lookup" ADD CONSTRAINT "nx09_vin_lookup_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_vin_lookup" ADD CONSTRAINT "nx09_vin_lookup_car_brand_id_fkey" FOREIGN KEY ("car_brand_id") REFERENCES "nx01_car_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_vin_lookup" ADD CONSTRAINT "nx09_vin_lookup_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "nx01_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_repair_sop" ADD CONSTRAINT "nx09_repair_sop_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_repair_sop" ADD CONSTRAINT "nx09_repair_sop_car_model_filter_fkey" FOREIGN KEY ("car_model_filter") REFERENCES "nx01_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_repair_sop_part_model" ADD CONSTRAINT "nx09_repair_sop_part_model_repair_sop_id_fkey" FOREIGN KEY ("repair_sop_id") REFERENCES "nx09_repair_sop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_repair_sop_part_model" ADD CONSTRAINT "nx09_repair_sop_part_model_part_model_id_fkey" FOREIGN KEY ("part_model_id") REFERENCES "nx01_part_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
