-- packages/db-core/prisma/migrations/20260606210000_a2_address_restructure/migration.sql
-- 02 對齊第二批 A 軌 CP2 2026-06-06：地址全面結構化（合表 + countryId + DROP 純文字 + user 兩組地址）
--
-- 範圍：
--   1. DROP nx01_partner_shipping_address + nx01_partner_billing_address（皆 0 row、直接重建）
--   2. CREATE nx01_partner_address（統一衛星、addressType enum 'BILLING'/'SHIPPING'、收帳 1 筆 + 送貨多筆、一筆 isDefault）
--   3. partner 加 countryId + DROP 純文字 address
--   4. user 加 countryId + DROP 純文字 address + 戶籍 / 通訊兩組結構化地址
--
-- 國別分流：countryId=null 預設 TW 走字典 / countryId=非 TW 走 freeform。
-- 不為 3+3 路街層預留（Alex 拍板）。

-- ============================================================
-- 1. DROP 舊兩張地址表（皆 0 row）
-- ============================================================
DROP TABLE IF EXISTS "nx01_partner_shipping_address";
DROP TABLE IF EXISTS "nx01_partner_billing_address";

-- ============================================================
-- 2. CREATE 統一 partner_address 表
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_partner_address_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_partner_address_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PADR' || LPAD(nextval('seq_nx01_partner_address_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx01_partner_address" (
  "id"              VARCHAR(15) NOT NULL DEFAULT gen_nx01_partner_address_id(),
  "tenant_id"       VARCHAR(15) NOT NULL,
  "partner_id"      VARCHAR(15) NOT NULL,
  -- 地址類型：BILLING 收帳 / SHIPPING 送貨；收帳 1 筆、送貨可多筆
  "address_type"    VARCHAR(10) NOT NULL,
  -- 顯示用標籤（送貨用、如「總公司」「桃園倉」；收帳通常為「主要收帳」）
  "label"           VARCHAR(50),
  -- 預設旗標（同 partner + addressType 內最多 1 筆 isDefault=true）
  "is_default"      BOOLEAN NOT NULL DEFAULT false,
  -- 國別分流：null 視為 TW 預設；非 null 走國外自由填
  "country_id"      VARCHAR(15),
  -- TW 字典（國外可空）
  "city_id"         VARCHAR(15),
  "district_id"     VARCHAR(15),
  "postal_code"     VARCHAR(10),
  -- 路 / 巷 / 弄 / 號 / 之 / 樓 / 室（TW 用結構化、國外可全空走 freeform）
  "street_name"     VARCHAR(100),
  "lane"            VARCHAR(20),
  "alley"           VARCHAR(20),
  "building_no"     VARCHAR(20),
  "building_sub_no" VARCHAR(20),
  "floor"           VARCHAR(20),
  "room_no"         VARCHAR(20),
  -- 國外自由填（country 非 TW 時用、結構化欄位可全空）
  "freeform_address" VARCHAR(500),
  -- 收件 / 送達聯絡
  "recipient_name"  VARCHAR(50),
  "recipient_phone" VARCHAR(50),
  "note"            VARCHAR(200),
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"      VARCHAR(15) NOT NULL,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"      VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_partner_address_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "nx01_partner_address_partner_type_idx"
  ON "nx01_partner_address" ("tenant_id", "partner_id", "address_type");

-- 收帳地址同 partner 內只能 1 筆（業務規則：每客戶單一收帳）
-- 送貨地址可多筆、不擋
CREATE UNIQUE INDEX IF NOT EXISTS "nx01_partner_address_billing_unique"
  ON "nx01_partner_address" ("tenant_id", "partner_id")
  WHERE address_type = 'BILLING' AND is_active = true;

-- 同 type 內 isDefault=true 最多 1 筆
CREATE UNIQUE INDEX IF NOT EXISTS "nx01_partner_address_default_unique"
  ON "nx01_partner_address" ("tenant_id", "partner_id", "address_type")
  WHERE is_default = true AND is_active = true;

ALTER TABLE "nx01_partner_address"
  ADD CONSTRAINT "nx01_partner_address_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "nx01_partner_address"
  ADD CONSTRAINT "nx01_partner_address_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "nx01_partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nx01_partner_address"
  ADD CONSTRAINT "nx01_partner_address_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "nx01_country" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx01_partner_address"
  ADD CONSTRAINT "nx01_partner_address_city_id_fkey"
  FOREIGN KEY ("city_id") REFERENCES "nx01_city" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx01_partner_address"
  ADD CONSTRAINT "nx01_partner_address_district_id_fkey"
  FOREIGN KEY ("district_id") REFERENCES "nx01_district" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 3. partner 加 countryId + DROP 純文字 address
-- ============================================================
ALTER TABLE "nx01_partner" ADD COLUMN IF NOT EXISTS "country_id" VARCHAR(15);
ALTER TABLE "nx01_partner"
  ADD CONSTRAINT "nx01_partner_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "nx01_country" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx01_partner" DROP COLUMN IF EXISTS "address";

-- ============================================================
-- 4. user 加 countryId + DROP 純文字 address + 戶籍 / 通訊兩組地址
-- ============================================================
ALTER TABLE "nx01_user" DROP COLUMN IF EXISTS "address";

ALTER TABLE "nx01_user" ADD COLUMN IF NOT EXISTS "country_id" VARCHAR(15);
ALTER TABLE "nx01_user"
  ADD CONSTRAINT "nx01_user_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "nx01_country" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 戶籍地址（household）：身分證住所、結構化最簡 4 欄
ALTER TABLE "nx01_user"
  ADD COLUMN IF NOT EXISTS "household_city_id"     VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "household_district_id" VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "household_postal_code" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "household_detail"      VARCHAR(200);
ALTER TABLE "nx01_user"
  ADD CONSTRAINT "nx01_user_household_city_id_fkey"
  FOREIGN KEY ("household_city_id") REFERENCES "nx01_city" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_user"
  ADD CONSTRAINT "nx01_user_household_district_id_fkey"
  FOREIGN KEY ("household_district_id") REFERENCES "nx01_district" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 通訊地址（mailing）：實際居住 / 收件、結構化最簡 4 欄
ALTER TABLE "nx01_user"
  ADD COLUMN IF NOT EXISTS "mailing_city_id"     VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "mailing_district_id" VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "mailing_postal_code" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "mailing_detail"      VARCHAR(200);
ALTER TABLE "nx01_user"
  ADD CONSTRAINT "nx01_user_mailing_city_id_fkey"
  FOREIGN KEY ("mailing_city_id") REFERENCES "nx01_city" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_user"
  ADD CONSTRAINT "nx01_user_mailing_district_id_fkey"
  FOREIGN KEY ("mailing_district_id") REFERENCES "nx01_district" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
