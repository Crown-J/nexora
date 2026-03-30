-- Align physical schema to docs/field_list.csv: remove wrong nx02_dept/nx03_emp/nx04_unit/nx05/nx06,
-- rename nx00_brand→nx00_part_brand, nx07→nx03 sales, nx08→nx03_so, nx09 stock→nx02,
-- add nx00_car_brand / part_group / nx04 financials / nx99_release stubs.

-- ---------------------------------------------------------------------------
-- 1) Drop obsolete tables (wrong module numbers)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS "nx06_product" CASCADE;
DROP TABLE IF EXISTS "nx03_emp" CASCADE;
DROP TABLE IF EXISTS "nx02_dept" CASCADE;
DROP TABLE IF EXISTS "nx05_category" CASCADE;
DROP TABLE IF EXISTS "nx04_unit" CASCADE;

-- ---------------------------------------------------------------------------
-- 2) nx00_brand → nx00_part_brand + ID function NX00PABR
-- ---------------------------------------------------------------------------
ALTER TABLE "nx00_brand" RENAME TO "nx00_part_brand";
ALTER TABLE "nx00_part_brand" RENAME CONSTRAINT "nx00_brand_pkey" TO "nx00_part_brand_pkey";
ALTER TABLE "nx00_part_brand" RENAME CONSTRAINT "nx00_brand_created_by_fkey" TO "nx00_part_brand_created_by_fkey";
ALTER TABLE "nx00_part_brand" RENAME CONSTRAINT "nx00_brand_updated_by_fkey" TO "nx00_part_brand_updated_by_fkey";

ALTER SEQUENCE IF EXISTS "seq_nx00_brand_id" RENAME TO "seq_nx00_pabr_id";
CREATE OR REPLACE FUNCTION gen_nx00_pabr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PABR' || LPAD(nextval('seq_nx00_pabr_id')::text, 7, '0');
$$ LANGUAGE sql;

ALTER TABLE "nx00_part_brand" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "nx00_part_brand" ALTER COLUMN "id" SET DEFAULT gen_nx00_pabr_id();

ALTER TABLE "nx00_part" DROP CONSTRAINT IF EXISTS "nx00_part_brand_id_fkey";
ALTER TABLE "nx00_part" RENAME COLUMN "brand_id" TO "part_brand_id";
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "is_oem" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "car_brand_id" VARCHAR(15);
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "type" VARCHAR(1);

DROP INDEX IF EXISTS "nx00_part_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "nx00_part_code_car_brand_id_key" ON "nx00_part"("code", "car_brand_id");
DROP INDEX IF EXISTS "nx00_part_brand_id_idx";
CREATE INDEX IF NOT EXISTS "nx00_part_part_brand_id_idx" ON "nx00_part"("part_brand_id");
CREATE INDEX IF NOT EXISTS "nx00_part_car_brand_id_idx" ON "nx00_part"("car_brand_id");

ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_part_brand_id_fkey"
  FOREIGN KEY ("part_brand_id") REFERENCES "nx00_part_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3) nx00_user.employee_id
-- ---------------------------------------------------------------------------
ALTER TABLE "nx00_user" ADD COLUMN IF NOT EXISTS "employee_id" VARCHAR(15);

-- ---------------------------------------------------------------------------
-- 4) nx00_car_brand, nx00_part_group, nx00_part_group_map
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_nx00_cabr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_cabr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00CABR' || LPAD(nextval('seq_nx00_cabr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx00_car_brand" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_cabr_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "origin_country" VARCHAR(50),
    "part_brand_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_car_brand_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nx00_car_brand_code_key" ON "nx00_car_brand"("code");
ALTER TABLE "nx00_car_brand" ADD CONSTRAINT "nx00_car_brand_part_brand_id_fkey"
  FOREIGN KEY ("part_brand_id") REFERENCES "nx00_part_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_car_brand_id_fkey"
  FOREIGN KEY ("car_brand_id") REFERENCES "nx00_car_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_pagr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_pagr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PAGR' || LPAD(nextval('seq_nx00_pagr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx00_part_group" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_pagr_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "car_brand_id" VARCHAR(15) NOT NULL,
    "seg1" VARCHAR(3) NOT NULL,
    "seg2" VARCHAR(3) NOT NULL,
    "seg3" VARCHAR(3) NOT NULL,
    "seg4" VARCHAR(3),
    "seg5" VARCHAR(3),
    "sort_no" VARCHAR(30) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_part_group_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nx00_part_group_car_brand_id_code_key" ON "nx00_part_group"("car_brand_id", "code");
ALTER TABLE "nx00_part_group" ADD CONSTRAINT "nx00_part_group_car_brand_id_fkey"
  FOREIGN KEY ("car_brand_id") REFERENCES "nx00_car_brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_pagm_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_pagm_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PAGM' || LPAD(nextval('seq_nx00_pagm_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx00_part_group_map" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_pagm_id(),
    "part_id" VARCHAR(15) NOT NULL,
    "group_id" VARCHAR(15) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    CONSTRAINT "nx00_part_group_map_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "nx00_part_group_map_part_id_group_id_key" UNIQUE ("part_id", "group_id")
);
ALTER TABLE "nx00_part_group_map" ADD CONSTRAINT "nx00_part_group_map_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx00_part_group_map" ADD CONSTRAINT "nx00_part_group_map_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "nx00_part_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 5) Rename nx07_quote → nx03_quote, extend columns, new ID default
-- ---------------------------------------------------------------------------
ALTER TABLE "nx07_quote" RENAME TO "nx03_quote";
ALTER TABLE "nx03_quote" RENAME CONSTRAINT "nx07_quote_pkey" TO "nx03_quote_pkey";

ALTER SEQUENCE IF EXISTS "nx07_quote_seq" RENAME TO "nx03_qthd_seq";
CREATE OR REPLACE FUNCTION gen_nx03_qthd_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03QTHD' || LPAD(nextval('nx03_qthd_seq')::text, 7, '0');
$$ LANGUAGE sql;
ALTER TABLE "nx03_quote" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "nx03_quote" ALTER COLUMN "id" SET DEFAULT gen_nx03_qthd_id();

ALTER TABLE "nx03_quote" ADD COLUMN IF NOT EXISTS "contact_name" VARCHAR(50);
ALTER TABLE "nx03_quote" ADD COLUMN IF NOT EXISTS "contact_phone" VARCHAR(30);
ALTER TABLE "nx03_quote" ADD COLUMN IF NOT EXISTS "valid_until" DATE;
ALTER TABLE "nx03_quote" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_quote" ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_quote" ADD COLUMN IF NOT EXISTS "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_quote" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3);
ALTER TABLE "nx03_quote" ADD COLUMN IF NOT EXISTS "voided_by" VARCHAR(15);
ALTER TABLE "nx03_quote" ALTER COLUMN "status" TYPE VARCHAR(1);
UPDATE "nx03_quote" SET "status" = LEFT(COALESCE("status", 'D'), 1);

DROP INDEX IF EXISTS "nx07_quote_doc_no_key";
CREATE UNIQUE INDEX IF NOT EXISTS "nx03_quote_doc_no_key" ON "nx03_quote"("doc_no");

ALTER TABLE "nx03_quote" RENAME CONSTRAINT "nx07_quote_tenant_id_fkey" TO "nx03_quote_tenant_id_fkey";
ALTER TABLE "nx03_quote" RENAME CONSTRAINT "nx07_quote_customer_id_fkey" TO "nx03_quote_customer_id_fkey";
ALTER TABLE "nx03_quote" RENAME CONSTRAINT "nx07_quote_rfq_id_fkey" TO "nx03_quote_rfq_id_fkey";

-- ---------------------------------------------------------------------------
-- 6) nx07_quote_item → nx03_quote_item
-- ---------------------------------------------------------------------------
ALTER TABLE "nx07_quote_item" RENAME TO "nx03_quote_item";
ALTER TABLE "nx03_quote_item" RENAME CONSTRAINT "nx07_quote_item_pkey" TO "nx03_quote_item_pkey";

ALTER SEQUENCE IF EXISTS "nx07_quote_item_seq" RENAME TO "nx03_qtit_seq";
CREATE OR REPLACE FUNCTION gen_nx03_qtit_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03QTIT' || LPAD(nextval('nx03_qtit_seq')::text, 7, '0');
$$ LANGUAGE sql;
ALTER TABLE "nx03_quote_item" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "nx03_quote_item" ALTER COLUMN "id" SET DEFAULT gen_nx03_qtit_id();

ALTER TABLE "nx03_quote_item" ADD COLUMN IF NOT EXISTS "part_brand_id" VARCHAR(15);
ALTER TABLE "nx03_quote_item" ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_quote_item" ADD COLUMN IF NOT EXISTS "discount_rate" DECIMAL(6,4) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_quote_item" ADD COLUMN IF NOT EXISTS "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_quote_item" ADD COLUMN IF NOT EXISTS "est_unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_quote_item" ADD COLUMN IF NOT EXISTS "est_margin_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
UPDATE "nx03_quote_item" SET "unit_price" = COALESCE("unit_price_snapshot", 0) WHERE "unit_price" = 0;

ALTER TABLE "nx03_quote_item" ALTER COLUMN "rfq_item_id" DROP NOT NULL;

ALTER TABLE "nx03_quote_item" RENAME CONSTRAINT "nx07_quote_item_tenant_id_fkey" TO "nx03_quote_item_tenant_id_fkey";
ALTER TABLE "nx03_quote_item" RENAME CONSTRAINT "nx07_quote_item_quote_id_fkey" TO "nx03_quote_item_quote_id_fkey";
ALTER TABLE "nx03_quote_item" RENAME CONSTRAINT "nx07_quote_item_rfq_item_id_fkey" TO "nx03_quote_item_rfq_item_id_fkey";
ALTER TABLE "nx03_quote_item" RENAME CONSTRAINT "nx07_quote_item_part_id_fkey" TO "nx03_quote_item_part_id_fkey";

ALTER TABLE "nx03_quote_item" DROP CONSTRAINT IF EXISTS "nx03_quote_item_rfq_item_id_fkey";
ALTER TABLE "nx03_quote_item" ADD CONSTRAINT "nx03_quote_item_rfq_item_id_fkey"
  FOREIGN KEY ("rfq_item_id") REFERENCES "nx01_rfq_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx03_quote_item" ADD CONSTRAINT "nx03_quote_item_part_brand_id_fkey"
  FOREIGN KEY ("part_brand_id") REFERENCES "nx00_part_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 7) nx08_sales_order → nx03_so
-- ---------------------------------------------------------------------------
ALTER TABLE "nx08_sales_order" RENAME TO "nx03_so";
ALTER TABLE "nx03_so" RENAME CONSTRAINT "nx08_sales_order_pkey" TO "nx03_so_pkey";

ALTER SEQUENCE IF EXISTS "nx08_sales_order_seq" RENAME TO "nx03_sohd_seq";
CREATE OR REPLACE FUNCTION gen_nx03_sohd_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03SOHD' || LPAD(nextval('nx03_sohd_seq')::text, 7, '0');
$$ LANGUAGE sql;
ALTER TABLE "nx03_so" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "nx03_so" ALTER COLUMN "id" SET DEFAULT gen_nx03_sohd_id();

ALTER TABLE "nx03_so" RENAME COLUMN "quote_id" TO "source_quote_id";
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "contact_name" VARCHAR(50);
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "contact_phone" VARCHAR(30);
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "warehouse_id" VARCHAR(15);
UPDATE "nx03_so" s SET "warehouse_id" = w.id FROM (
  SELECT id FROM "nx00_warehouse" ORDER BY "sort_no" LIMIT 1
) w WHERE s."warehouse_id" IS NULL;
ALTER TABLE "nx03_so" ALTER COLUMN "warehouse_id" SET NOT NULL;
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "posted_at" TIMESTAMP(3);
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "posted_by" VARCHAR(15);
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3);
ALTER TABLE "nx03_so" ADD COLUMN IF NOT EXISTS "voided_by" VARCHAR(15);
ALTER TABLE "nx03_so" ALTER COLUMN "status" TYPE VARCHAR(1);
UPDATE "nx03_so" SET "status" = LEFT(COALESCE("status", 'D'), 1);

DROP INDEX IF EXISTS "nx08_sales_order_doc_no_key";
CREATE UNIQUE INDEX IF NOT EXISTS "nx03_so_doc_no_key" ON "nx03_so"("doc_no");

ALTER TABLE "nx03_so" RENAME CONSTRAINT "nx08_sales_order_tenant_id_fkey" TO "nx03_so_tenant_id_fkey";
ALTER TABLE "nx03_so" RENAME CONSTRAINT "nx08_sales_order_customer_id_fkey" TO "nx03_so_customer_id_fkey";
ALTER TABLE "nx03_so" DROP CONSTRAINT IF EXISTS "nx08_sales_order_quote_id_fkey";
ALTER TABLE "nx03_so" ADD CONSTRAINT "nx03_so_source_quote_id_fkey"
  FOREIGN KEY ("source_quote_id") REFERENCES "nx03_quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx03_so" ADD CONSTRAINT "nx03_so_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 8) nx08_sales_order_item → nx03_so_item
-- ---------------------------------------------------------------------------
ALTER TABLE "nx08_sales_order_item" RENAME TO "nx03_so_item";
ALTER TABLE "nx03_so_item" RENAME CONSTRAINT "nx08_sales_order_item_pkey" TO "nx03_so_item_pkey";

ALTER SEQUENCE IF EXISTS "nx08_sales_order_item_seq" RENAME TO "nx03_soit_seq";
CREATE OR REPLACE FUNCTION gen_nx03_soit_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03SOIT' || LPAD(nextval('nx03_soit_seq')::text, 7, '0');
$$ LANGUAGE sql;
ALTER TABLE "nx03_so_item" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "nx03_so_item" ALTER COLUMN "id" SET DEFAULT gen_nx03_soit_id();

ALTER TABLE "nx03_so_item" RENAME COLUMN "sales_order_id" TO "so_id";
ALTER TABLE "nx03_so_item" RENAME COLUMN "quote_item_id" TO "source_quote_item_id";
ALTER TABLE "nx03_so_item" RENAME COLUMN "unit_price_snapshot" TO "unit_price";
ALTER TABLE "nx03_so_item" ADD COLUMN IF NOT EXISTS "part_brand_id" VARCHAR(15);
ALTER TABLE "nx03_so_item" ADD COLUMN IF NOT EXISTS "discount_rate" DECIMAL(6,4) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_so_item" ADD COLUMN IF NOT EXISTS "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_so_item" ADD COLUMN IF NOT EXISTS "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_so_item" ADD COLUMN IF NOT EXISTS "cost_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_so_item" ADD COLUMN IF NOT EXISTS "margin_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx03_so_item" ADD COLUMN IF NOT EXISTS "source_quote_id" VARCHAR(15);

ALTER TABLE "nx03_so_item" RENAME CONSTRAINT "nx08_sales_order_item_tenant_id_fkey" TO "nx03_so_item_tenant_id_fkey";
ALTER TABLE "nx03_so_item" RENAME CONSTRAINT "nx08_sales_order_item_sales_order_id_fkey" TO "nx03_so_item_so_id_fkey";
ALTER TABLE "nx03_so_item" RENAME CONSTRAINT "nx08_sales_order_item_quote_item_id_fkey" TO "nx03_so_item_source_quote_item_id_fkey";
ALTER TABLE "nx03_so_item" RENAME CONSTRAINT "nx08_sales_order_item_part_id_fkey" TO "nx03_so_item_part_id_fkey";
ALTER TABLE "nx03_so_item" RENAME CONSTRAINT "nx08_sales_order_item_warehouse_id_fkey" TO "nx03_so_item_warehouse_id_fkey";
ALTER TABLE "nx03_so_item" RENAME CONSTRAINT "nx08_sales_order_item_location_id_fkey" TO "nx03_so_item_location_id_fkey";

ALTER TABLE "nx03_so_item" DROP CONSTRAINT IF EXISTS "nx03_so_item_source_quote_item_id_fkey";
ALTER TABLE "nx03_so_item" ADD CONSTRAINT "nx03_so_item_source_quote_item_id_fkey"
  FOREIGN KEY ("source_quote_item_id") REFERENCES "nx03_quote_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx03_so_item" ADD CONSTRAINT "nx03_so_item_part_brand_id_fkey"
  FOREIGN KEY ("part_brand_id") REFERENCES "nx00_part_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 9) nx09_stock_balance → nx02_stock_balance (add location + design fields)
-- ---------------------------------------------------------------------------
ALTER TABLE "nx09_stock_balance" RENAME TO "nx02_stock_balance";
ALTER TABLE "nx02_stock_balance" RENAME CONSTRAINT "nx09_stock_balance_pkey" TO "nx02_stock_balance_pkey";

ALTER SEQUENCE IF EXISTS "nx09_stock_balance_seq" RENAME TO "nx02_stbl_seq";
CREATE OR REPLACE FUNCTION gen_nx02_stbl_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02STBL' || LPAD(nextval('nx02_stbl_seq')::text, 7, '0');
$$ LANGUAGE sql;
ALTER TABLE "nx02_stock_balance" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "nx02_stock_balance" ALTER COLUMN "id" SET DEFAULT gen_nx02_stbl_id();

ALTER TABLE "nx02_stock_balance" ADD COLUMN IF NOT EXISTS "location_id" VARCHAR(15);
UPDATE "nx02_stock_balance" b
SET "location_id" = (
  SELECT l.id FROM "nx00_location" l WHERE l."warehouse_id" = b."warehouse_id" ORDER BY l."sort_no" ASC LIMIT 1
)
WHERE b."location_id" IS NULL;
ALTER TABLE "nx02_stock_balance" ALTER COLUMN "tenant_id" DROP NOT NULL;
ALTER TABLE "nx02_stock_balance" RENAME COLUMN "qty" TO "on_hand_qty";
ALTER TABLE "nx02_stock_balance" ADD COLUMN IF NOT EXISTS "avg_cost" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "nx02_stock_balance" ADD COLUMN IF NOT EXISTS "stock_value" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx02_stock_balance" ADD COLUMN IF NOT EXISTS "last_in_at" TIMESTAMP(3);
ALTER TABLE "nx02_stock_balance" ADD COLUMN IF NOT EXISTS "last_out_at" TIMESTAMP(3);
ALTER TABLE "nx02_stock_balance" ADD COLUMN IF NOT EXISTS "last_move_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "nx02_stock_balance" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS "nx09_stock_balance_tenant_id_warehouse_id_part_id_key";
DROP INDEX IF EXISTS "nx09_stock_balance_warehouse_id_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "nx02_stock_balance_tenant_part_wh_loc_key"
  ON "nx02_stock_balance"("tenant_id", "part_id", "warehouse_id", "location_id");
CREATE INDEX IF NOT EXISTS "nx02_stock_balance_warehouse_id_idx" ON "nx02_stock_balance"("warehouse_id");

ALTER TABLE "nx02_stock_balance" RENAME CONSTRAINT "nx09_stock_balance_tenant_id_fkey" TO "nx02_stock_balance_tenant_id_fkey";
ALTER TABLE "nx02_stock_balance" RENAME CONSTRAINT "nx09_stock_balance_warehouse_id_fkey" TO "nx02_stock_balance_warehouse_id_fkey";
ALTER TABLE "nx02_stock_balance" RENAME CONSTRAINT "nx09_stock_balance_part_id_fkey" TO "nx02_stock_balance_part_id_fkey";
ALTER TABLE "nx02_stock_balance" ADD CONSTRAINT "nx02_stock_balance_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 10) nx09_stock_txn → nx02_stock_ledger
-- ---------------------------------------------------------------------------
ALTER TABLE "nx09_stock_txn" RENAME TO "nx02_stock_ledger";
ALTER TABLE "nx02_stock_ledger" RENAME CONSTRAINT "nx09_stock_txn_pkey" TO "nx02_stock_ledger_pkey";

ALTER SEQUENCE IF EXISTS "nx09_stock_txn_seq" RENAME TO "nx02_stle_seq";
CREATE OR REPLACE FUNCTION gen_nx02_stle_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02STLE' || LPAD(nextval('nx02_stle_seq')::text, 7, '0');
$$ LANGUAGE sql;
ALTER TABLE "nx02_stock_ledger" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "nx02_stock_ledger" ALTER COLUMN "id" SET DEFAULT gen_nx02_stle_id();

ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "movement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "nx02_stock_ledger" SET "movement_date" = "occurred_at";
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "location_id" VARCHAR(15);
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "movement_type" VARCHAR(1) NOT NULL DEFAULT 'I';
UPDATE "nx02_stock_ledger" SET "movement_type" = COALESCE("txn_type", 'I');
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "qty_in" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "qty_out" DECIMAL(14,4) NOT NULL DEFAULT 0;
UPDATE "nx02_stock_ledger" SET "qty_in" = CASE WHEN "txn_type" = 'I' THEN ABS("qty_delta") ELSE 0 END,
  "qty_out" = CASE WHEN "txn_type" = 'O' THEN ABS("qty_delta") ELSE 0 END;
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "total_cost" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "balance_qty" DECIMAL(14,4) NOT NULL DEFAULT 0;
UPDATE "nx02_stock_ledger" SET "balance_qty" = COALESCE("after_qty", 0);
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "balance_cost" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "source_module" VARCHAR(10) NOT NULL DEFAULT 'NX01';
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "source_doc_type" VARCHAR(1) NOT NULL DEFAULT 'P';
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "source_doc_id" VARCHAR(15) NOT NULL DEFAULT 'MIGRATE';
ALTER TABLE "nx02_stock_ledger" ADD COLUMN IF NOT EXISTS "source_item_id" VARCHAR(15);
UPDATE "nx02_stock_ledger" SET "source_doc_id" = COALESCE("ref_id", 'MIGRATE');
UPDATE "nx02_stock_ledger" SET "source_doc_type" = CASE WHEN "ref_type" ILIKE '%PO%' THEN 'P' ELSE 'S' END;

ALTER TABLE "nx02_stock_ledger" RENAME CONSTRAINT "nx09_stock_txn_tenant_id_fkey" TO "nx02_stock_ledger_tenant_id_fkey";
ALTER TABLE "nx02_stock_ledger" RENAME CONSTRAINT "nx09_stock_txn_warehouse_id_fkey" TO "nx02_stock_ledger_warehouse_id_fkey";
ALTER TABLE "nx02_stock_ledger" RENAME CONSTRAINT "nx09_stock_txn_part_id_fkey" TO "nx02_stock_ledger_part_id_fkey";
ALTER TABLE "nx02_stock_ledger" ALTER COLUMN "tenant_id" DROP NOT NULL;

DROP INDEX IF EXISTS "nx09_stock_txn_occurred_at_idx";
DROP INDEX IF EXISTS "nx09_stock_txn_warehouse_id_idx";
DROP INDEX IF EXISTS "nx09_stock_txn_part_id_idx";
CREATE INDEX IF NOT EXISTS "nx02_stock_ledger_movement_date_idx" ON "nx02_stock_ledger"("movement_date");
CREATE INDEX IF NOT EXISTS "nx02_stock_ledger_warehouse_id_idx" ON "nx02_stock_ledger"("warehouse_id");
CREATE INDEX IF NOT EXISTS "nx02_stock_ledger_part_id_idx" ON "nx02_stock_ledger"("part_id");

ALTER TABLE "nx02_stock_ledger" ADD CONSTRAINT "nx02_stock_ledger_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 11) Stubs: nx02_stock_take, nx02_stock_take_item, nx04_*, nx99_release*
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS nx02_sttk_seq START 1;
CREATE OR REPLACE FUNCTION gen_nx02_sttk_id()
RETURNS VARCHAR AS $$ SELECT 'NX02STTK' || LPAD(nextval('nx02_sttk_seq')::text, 7, '0'); $$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS nx02_stti_seq START 1;
CREATE OR REPLACE FUNCTION gen_nx02_stti_id()
RETURNS VARCHAR AS $$ SELECT 'NX02STTI' || LPAD(nextval('nx02_stti_seq')::text, 7, '0'); $$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS nx04_arle_seq START 1;
CREATE OR REPLACE FUNCTION gen_nx04_arle_id()
RETURNS VARCHAR AS $$ SELECT 'NX04ARLE' || LPAD(nextval('nx04_arle_seq')::text, 7, '0'); $$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS nx04_aple_seq START 1;
CREATE OR REPLACE FUNCTION gen_nx04_aple_id()
RETURNS VARCHAR AS $$ SELECT 'NX04APLE' || LPAD(nextval('nx04_aple_seq')::text, 7, '0'); $$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS nx04_payl_seq START 1;
CREATE OR REPLACE FUNCTION gen_nx04_payl_id()
RETURNS VARCHAR AS $$ SELECT 'NX04PAYL' || LPAD(nextval('nx04_payl_seq')::text, 7, '0'); $$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS nx04_docl_seq START 1;
CREATE OR REPLACE FUNCTION gen_nx04_docl_id()
RETURNS VARCHAR AS $$ SELECT 'NX04DOCL' || LPAD(nextval('nx04_docl_seq')::text, 7, '0'); $$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS nx99_rele_seq START 1;
CREATE OR REPLACE FUNCTION gen_nx99_rele_id()
RETURNS VARCHAR AS $$ SELECT 'NX99RELE' || LPAD(nextval('nx99_rele_seq')::text, 7, '0'); $$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS nx99_reit_seq START 1;
CREATE OR REPLACE FUNCTION gen_nx99_reit_id()
RETURNS VARCHAR AS $$ SELECT 'NX99REIT' || LPAD(nextval('nx99_reit_seq')::text, 7, '0'); $$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx02_stock_take" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_sttk_id(),
  "doc_no" VARCHAR(15) NOT NULL,
  "stock_take_date" DATE NOT NULL,
  "warehouse_id" VARCHAR(15) NOT NULL,
  "scope_type" VARCHAR(1) NOT NULL DEFAULT 'F',
  "status" VARCHAR(1) NOT NULL DEFAULT 'D',
  "remark" VARCHAR(200),
  "posted_at" TIMESTAMP(3),
  "posted_by" VARCHAR(15),
  "voided_at" TIMESTAMP(3),
  "voided_by" VARCHAR(15),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" VARCHAR(15),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" VARCHAR(15),
  CONSTRAINT "nx02_stock_take_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nx02_stock_take_doc_no_key" ON "nx02_stock_take"("doc_no");
ALTER TABLE "nx02_stock_take" ADD CONSTRAINT "nx02_stock_take_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx02_stock_take_item" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_stti_id(),
  "stock_take_id" VARCHAR(15) NOT NULL,
  "line_no" INTEGER NOT NULL,
  "part_id" VARCHAR(15) NOT NULL,
  "part_no" VARCHAR(50) NOT NULL,
  "part_name" VARCHAR(200) NOT NULL,
  "warehouse_id" VARCHAR(15) NOT NULL,
  "location_id" VARCHAR(15) NOT NULL,
  "system_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "counted_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "diff_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "diff_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "adjust_type" VARCHAR(1) NOT NULL DEFAULT 'N',
  "status" VARCHAR(1) NOT NULL DEFAULT 'O',
  "remark" VARCHAR(200),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" VARCHAR(15),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" VARCHAR(15),
  CONSTRAINT "nx02_stock_take_item_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_stock_take_id_fkey"
  FOREIGN KEY ("stock_take_id") REFERENCES "nx02_stock_take"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx04_ar_ledger" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_arle_id(),
  "customer_id" VARCHAR(15) NOT NULL,
  "ar_date" DATE NOT NULL,
  "due_date" DATE,
  "source_doc_type" VARCHAR(1) NOT NULL DEFAULT 'S',
  "source_doc_id" VARCHAR(15) NOT NULL,
  "source_doc_no" VARCHAR(20) NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "balance_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" VARCHAR(1) NOT NULL DEFAULT 'O',
  "remark" VARCHAR(200),
  "voided_at" TIMESTAMP(3),
  "voided_by" VARCHAR(15),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" VARCHAR(15),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" VARCHAR(15),
  CONSTRAINT "nx04_ar_ledger_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "nx04_ar_ledger" ADD CONSTRAINT "nx04_ar_ledger_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx04_ap_ledger" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_aple_id(),
  "supplier_id" VARCHAR(15) NOT NULL,
  "ap_date" DATE NOT NULL,
  "due_date" DATE,
  "source_doc_type" VARCHAR(1) NOT NULL DEFAULT 'P',
  "source_doc_id" VARCHAR(15) NOT NULL,
  "source_doc_no" VARCHAR(20) NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "balance_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" VARCHAR(1) NOT NULL DEFAULT 'O',
  "remark" VARCHAR(200),
  "voided_at" TIMESTAMP(3),
  "voided_by" VARCHAR(15),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" VARCHAR(15),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" VARCHAR(15),
  CONSTRAINT "nx04_ap_ledger_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "nx04_ap_ledger" ADD CONSTRAINT "nx04_ap_ledger_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx04_paylog" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_payl_id(),
  "pay_no" VARCHAR(15) NOT NULL,
  "pay_date" DATE NOT NULL,
  "pay_type" VARCHAR(1) NOT NULL,
  "partner_id" VARCHAR(15) NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "method" VARCHAR(1) NOT NULL DEFAULT 'C',
  "ref_no" VARCHAR(50),
  "target_ledger_type" VARCHAR(1) NOT NULL DEFAULT 'R',
  "target_ledger_id" VARCHAR(15),
  "status" VARCHAR(1) NOT NULL DEFAULT 'P',
  "remark" VARCHAR(200),
  "voided_at" TIMESTAMP(3),
  "voided_by" VARCHAR(15),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" VARCHAR(15),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" VARCHAR(15),
  CONSTRAINT "nx04_paylog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nx04_paylog_pay_no_key" ON "nx04_paylog"("pay_no");
ALTER TABLE "nx04_paylog" ADD CONSTRAINT "nx04_paylog_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx04_doc_link" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_docl_id(),
  "from_doc_type" VARCHAR(1) NOT NULL,
  "from_doc_id" VARCHAR(15) NOT NULL,
  "from_doc_no" VARCHAR(15) NOT NULL,
  "from_item_id" VARCHAR(15),
  "to_doc_type" VARCHAR(1) NOT NULL,
  "to_doc_id" VARCHAR(15) NOT NULL,
  "to_doc_no" VARCHAR(15) NOT NULL,
  "to_item_id" VARCHAR(15),
  "link_type" VARCHAR(1) NOT NULL,
  "link_note" VARCHAR(200),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" VARCHAR(15),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" VARCHAR(15),
  CONSTRAINT "nx04_doc_link_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "nx99_release" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_rele_id(),
  "version_code" VARCHAR(30) NOT NULL,
  "title" VARCHAR(100) NOT NULL,
  "released_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" VARCHAR(15),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" VARCHAR(15),
  CONSTRAINT "nx99_release_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nx99_release_version_code_key" ON "nx99_release"("version_code");

CREATE TABLE IF NOT EXISTS "nx99_release_item" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_reit_id(),
  "release_id" VARCHAR(15) NOT NULL,
  "line_no" INTEGER NOT NULL,
  "content" VARCHAR(500) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nx99_release_item_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "nx99_release_item" ADD CONSTRAINT "nx99_release_item_release_id_fkey"
  FOREIGN KEY ("release_id") REFERENCES "nx99_release"("id") ON DELETE CASCADE ON UPDATE CASCADE;
