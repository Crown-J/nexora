-- TASK-PHASE2-NX01-ADDRESS-SCHEMA-EXTEND-01
-- NX01-04 客戶地址管理 v1.0：2 張客戶地址表 + 6 巷弄門牌欄位
-- partner.address VARCHAR(200) 階段 1 並存（既有欄位保留、不動）

-- =======================================================
-- ID generator function + sequence（對齊 nx10_checkin_log 後加 model 慣例）
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS seq_nx01_partner_billing_address_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_partner_billing_address_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PBAD' || LPAD(nextval('seq_nx01_partner_billing_address_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_partner_shipping_address_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_partner_shipping_address_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PSAD' || LPAD(nextval('seq_nx01_partner_shipping_address_id')::text, 7, '0');
$$ LANGUAGE sql;

-- CreateTable
CREATE TABLE "nx01_partner_billing_address" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_partner_billing_address_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "partner_id" VARCHAR(15) NOT NULL,
    "city_id" VARCHAR(15) NOT NULL,
    "district_id" VARCHAR(15) NOT NULL,
    "street_id" VARCHAR(15) NOT NULL,
    "lane" INTEGER,
    "alley" INTEGER,
    "building_no" INTEGER NOT NULL,
    "building_sub_no" INTEGER,
    "floor" VARCHAR(10),
    "room_no" VARCHAR(20),
    "recipient_name" VARCHAR(50) NOT NULL,
    "recipient_phone" VARCHAR(30) NOT NULL,
    "note" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_partner_billing_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_partner_shipping_address" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_partner_shipping_address_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "partner_id" VARCHAR(15) NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "city_id" VARCHAR(15) NOT NULL,
    "district_id" VARCHAR(15) NOT NULL,
    "street_id" VARCHAR(15) NOT NULL,
    "lane" INTEGER,
    "alley" INTEGER,
    "building_no" INTEGER NOT NULL,
    "building_sub_no" INTEGER,
    "floor" VARCHAR(10),
    "room_no" VARCHAR(20),
    "recipient_name" VARCHAR(50) NOT NULL,
    "recipient_phone" VARCHAR(30) NOT NULL,
    "note" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_partner_shipping_address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx01_partner_billing_address_partner_id_key" ON "nx01_partner_billing_address"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_partner_shipping_address_partner_id_label_key" ON "nx01_partner_shipping_address"("partner_id", "label");

-- =======================================================
-- Partial unique index：同 partner 只能 1 筆 is_default = true
-- 對齊 NX01-04 §3.1「DB partial unique index + application 層雙重保證」
-- =======================================================
CREATE UNIQUE INDEX "nx01_partner_shipping_address_partner_id_is_default_unique"
  ON "nx01_partner_shipping_address"("partner_id")
  WHERE "is_default" = true;

-- AddForeignKey
ALTER TABLE "nx01_partner_billing_address" ADD CONSTRAINT "nx01_partner_billing_address_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner_billing_address" ADD CONSTRAINT "nx01_partner_billing_address_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner_billing_address" ADD CONSTRAINT "nx01_partner_billing_address_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "nx01_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner_billing_address" ADD CONSTRAINT "nx01_partner_billing_address_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "nx01_district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner_billing_address" ADD CONSTRAINT "nx01_partner_billing_address_street_id_fkey" FOREIGN KEY ("street_id") REFERENCES "nx01_street"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner_shipping_address" ADD CONSTRAINT "nx01_partner_shipping_address_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner_shipping_address" ADD CONSTRAINT "nx01_partner_shipping_address_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner_shipping_address" ADD CONSTRAINT "nx01_partner_shipping_address_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "nx01_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner_shipping_address" ADD CONSTRAINT "nx01_partner_shipping_address_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "nx01_district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner_shipping_address" ADD CONSTRAINT "nx01_partner_shipping_address_street_id_fkey" FOREIGN KEY ("street_id") REFERENCES "nx01_street"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =======================================================
-- 階段 1 並存策略確認：
-- nx01_partner.address VARCHAR(200) 既有欄位保留、不動
-- 業務人員建新 partner 時：用新 nx01_partner_billing_address / nx01_partner_shipping_address 表
-- 業務人員看舊 partner 時：仍能看到 nx01_partner.address 內容
-- 階段 2/3（遷移 / 廢棄）由 Crown 之後拍另一個 task
-- 對齊 PROJECT_CONTEXT 擴充原則 #23 類型 2「升級既有結構」3 階段演進
-- =======================================================
