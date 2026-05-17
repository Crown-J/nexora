-- NX06-IMPL-02 Phase 1 M4：schema drift 結算（Prisma migrate dev 自動產出）
-- 對齊：M1+M2+M3 套用後、prisma 偵測 schema.prisma 與 hand-written SQL 之間差異、自動產生本檔結算
-- 內容性質（誠實揭露）：
--   1. M2/M3 我的 CONSTRAINT 自訂名 → Prisma convention 名（fk_handover_dn → nx06_dn_handover_dn_id_fkey 等）
--   2. 累積自前軌的 pre-existing drift cleanup（nx01_warehouse FK / nx01_partner_shipping_address 索引 / nx01_brand_code_rule DEFAULT 移除 / RenameIndex × N）
-- 風險：低
--   - constraint/index 名變更不影響行為（FK 邏輯不變）
--   - pre-existing drift 多為前軌 schema.prisma vs 早期 SQL 偏差、Prisma 認為應對齊
-- A026 backlog：本檔包含 pre-existing drift，後續軌可寫獨立 drift-audit 釐清來源

-- DropForeignKey
ALTER TABLE "nx01_warehouse" DROP CONSTRAINT "nx01_warehouse_city_id_fkey";

-- DropForeignKey
ALTER TABLE "nx01_warehouse" DROP CONSTRAINT "nx01_warehouse_district_id_fkey";

-- DropForeignKey
ALTER TABLE "nx01_warehouse" DROP CONSTRAINT "nx01_warehouse_street_id_fkey";

-- DropForeignKey
ALTER TABLE "nx06_dn_handover" DROP CONSTRAINT "fk_handover_dn";

-- DropForeignKey
ALTER TABLE "nx06_dn_handover" DROP CONSTRAINT "fk_handover_from";

-- DropForeignKey
ALTER TABLE "nx06_dn_handover" DROP CONSTRAINT "fk_handover_tenant";

-- DropForeignKey
ALTER TABLE "nx06_dn_handover" DROP CONSTRAINT "fk_handover_to";

-- DropForeignKey
ALTER TABLE "nx06_push_subscription" DROP CONSTRAINT "fk_push_tenant";

-- DropForeignKey
ALTER TABLE "nx06_push_subscription" DROP CONSTRAINT "fk_push_user";

-- DropIndex
DROP INDEX "nx01_partner_shipping_address_partner_id_is_default_unique";

-- DropIndex
DROP INDEX "nx01_warehouse_tenant_id_is_main_unique";

-- AlterTable
ALTER TABLE "nx01_brand_code_rule" ALTER COLUMN "seg_definitions" DROP DEFAULT;

-- AlterTable
ALTER TABLE "nx01_bulletin" ALTER COLUMN "audience_user_ids" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "nx01_warehouse" ADD CONSTRAINT "nx01_warehouse_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "nx01_city"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_warehouse" ADD CONSTRAINT "nx01_warehouse_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "nx01_district"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_warehouse" ADD CONSTRAINT "nx01_warehouse_street_id_fkey" FOREIGN KEY ("street_id") REFERENCES "nx01_street"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_handover" ADD CONSTRAINT "nx06_dn_handover_dn_id_fkey" FOREIGN KEY ("dn_id") REFERENCES "nx06_dn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_handover" ADD CONSTRAINT "nx06_dn_handover_from_driver_id_fkey" FOREIGN KEY ("from_driver_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_handover" ADD CONSTRAINT "nx06_dn_handover_to_driver_id_fkey" FOREIGN KEY ("to_driver_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_handover" ADD CONSTRAINT "nx06_dn_handover_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_push_subscription" ADD CONSTRAINT "nx06_push_subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_push_subscription" ADD CONSTRAINT "nx06_push_subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "nx01_bulletin_category_tenant_id_code_unique" RENAME TO "nx01_bulletin_category_tenant_id_code_key";

-- RenameIndex
ALTER INDEX "nx01_bulletin_read_log_bulletin_id_user_id_unique" RENAME TO "nx01_bulletin_read_log_bulletin_id_user_id_key";

-- RenameIndex
ALTER INDEX "nx01_part_relation_tenant_id_part_id_from_part_id_to_rel_key" RENAME TO "nx01_part_relation_tenant_id_part_id_from_part_id_to_relati_key";

-- RenameIndex
ALTER INDEX "nx01_phonetic_index_tenant_table_source_key" RENAME TO "nx01_phonetic_index_tenant_id_source_table_source_id_key";

-- RenameIndex
ALTER INDEX "nx03_brand_allocation_rule_tenant_model_idx" RENAME TO "nx03_brand_allocation_rule_tenant_id_model_id_idx";

-- RenameIndex
ALTER INDEX "nx03_brand_allocation_rule_tenant_model_valid_from_key" RENAME TO "nx03_brand_allocation_rule_tenant_id_model_id_valid_from_key";
