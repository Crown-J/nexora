-- TASK-PHASE2-NX01-ADDRESS-SCHEMA-EXTEND-01
-- NX01-09 地址型錄系統 v1.0：3 張全域型錄主檔（city / district / street）
-- 對齊 nx01_partner.address VARCHAR(200) 升級擴充原則 #23 類型 2 階段 1

-- =======================================================
-- ID generator function + sequence（對齊 nx10_checkin_log 後加 model 慣例）
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS seq_nx01_city_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_city_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01CITY' || LPAD(nextval('seq_nx01_city_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_district_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_district_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01DIST' || LPAD(nextval('seq_nx01_district_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_street_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_street_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01STRT' || LPAD(nextval('seq_nx01_street_id')::text, 7, '0');
$$ LANGUAGE sql;

-- CreateTable
CREATE TABLE "nx01_city" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_city_id(),
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "name_en" VARCHAR(50),
    "country_id" VARCHAR(15) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_city_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_district" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_district_id(),
    "city_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(5) NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "name_en" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_district_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_street" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_street_id(),
    "district_id" VARCHAR(15) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(200),
    "zipcode_3" VARCHAR(3) NOT NULL,
    "zipcode_full" VARCHAR(7) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_street_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx01_city_country_id_code_key" ON "nx01_city"("country_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_district_city_id_code_key" ON "nx01_district"("city_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_district_city_id_name_key" ON "nx01_district"("city_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_street_district_id_name_key" ON "nx01_street"("district_id", "name");

-- AddForeignKey
ALTER TABLE "nx01_city" ADD CONSTRAINT "nx01_city_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "nx01_country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_district" ADD CONSTRAINT "nx01_district_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "nx01_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_street" ADD CONSTRAINT "nx01_street_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "nx01_district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
