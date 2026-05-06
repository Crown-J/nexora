-- TASK-PHASE2-NX01-WAREHOUSE-SCHEMA-EXTEND-01
-- nx01_warehouse 補建：地址結構化欄位（NX01-06 規格書 v1.1 §3.2 + §4 + 對齊 NX01-04 §4.6）
--
-- 變更（全 nullable、階段 1 並存策略、對齊 NX01-04 partner.address 範式）：
--   1. 加 city_id / district_id / street_id（FK to NX01-09 三表、ON DELETE RESTRICT）
--   2. 加 6 巷弄門牌欄位：lane / alley / building_no / building_sub_no / floor / room_no
--
-- ⚠️ 規格書 §3.2 寫 city_id / district_id / street_id / building_no 必填、schema nullable：
--   - 既有 6 倉 dev 資料保留、新建倉 application 層強制必填
--   - 對齊 partner.address 階段 1 並存策略
--   - 揭露在 A036 紀錄

-- AlterTable
ALTER TABLE "nx01_warehouse"
ADD COLUMN "city_id" VARCHAR(15),
ADD COLUMN "district_id" VARCHAR(15),
ADD COLUMN "street_id" VARCHAR(15),
ADD COLUMN "lane" INTEGER,
ADD COLUMN "alley" INTEGER,
ADD COLUMN "building_no" INTEGER,
ADD COLUMN "building_sub_no" INTEGER,
ADD COLUMN "floor" VARCHAR(10),
ADD COLUMN "room_no" VARCHAR(20);

-- AddForeignKey
ALTER TABLE "nx01_warehouse"
ADD CONSTRAINT "nx01_warehouse_city_id_fkey"
FOREIGN KEY ("city_id") REFERENCES "nx01_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_warehouse"
ADD CONSTRAINT "nx01_warehouse_district_id_fkey"
FOREIGN KEY ("district_id") REFERENCES "nx01_district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_warehouse"
ADD CONSTRAINT "nx01_warehouse_street_id_fkey"
FOREIGN KEY ("street_id") REFERENCES "nx01_street"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
