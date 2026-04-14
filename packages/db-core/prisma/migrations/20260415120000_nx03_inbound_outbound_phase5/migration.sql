-- NX03 Phase 5: inbound/outbound tables; widen stock_take / st status & doc_no; normalize legacy status chars.

CREATE SEQUENCE IF NOT EXISTS seq_nx03_inbound_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_inbound_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03IBHT' || LPAD(nextval('seq_nx03_inbound_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_inbound_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_inbound_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03IBIT' || LPAD(nextval('seq_nx03_inbound_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_outbound_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_outbound_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03OBHT' || LPAD(nextval('seq_nx03_outbound_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_outbound_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_outbound_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03OBIT' || LPAD(nextval('seq_nx03_outbound_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE "nx03_inbound" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_inbound_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "inbound_date" DATE NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "remark" VARCHAR(200),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx03_inbound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nx03_inbound_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_inbound_item_id(),
    "inbound_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "location_id" VARCHAR(15) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx03_inbound_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nx03_outbound" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_outbound_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "outbound_date" DATE NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "remark" VARCHAR(200),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),
    "shipped_at" TIMESTAMP(3),
    "shipped_by" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx03_outbound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nx03_outbound_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_outbound_item_id(),
    "outbound_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "location_id" VARCHAR(15) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx03_outbound_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx03_inbound_doc_no_key" ON "nx03_inbound"("doc_no");
CREATE UNIQUE INDEX "nx03_outbound_doc_no_key" ON "nx03_outbound"("doc_no");

ALTER TABLE "nx03_inbound" ADD CONSTRAINT "nx03_inbound_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx03_inbound" ADD CONSTRAINT "nx03_inbound_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_inbound_item" ADD CONSTRAINT "nx03_inbound_item_inbound_id_fkey" FOREIGN KEY ("inbound_id") REFERENCES "nx03_inbound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx03_inbound_item" ADD CONSTRAINT "nx03_inbound_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx03_inbound_item" ADD CONSTRAINT "nx03_inbound_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_outbound" ADD CONSTRAINT "nx03_outbound_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx03_outbound" ADD CONSTRAINT "nx03_outbound_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_outbound_item" ADD CONSTRAINT "nx03_outbound_item_outbound_id_fkey" FOREIGN KEY ("outbound_id") REFERENCES "nx03_outbound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx03_outbound_item" ADD CONSTRAINT "nx03_outbound_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx03_outbound_item" ADD CONSTRAINT "nx03_outbound_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- stock_take / transfer: API status tokens + longer doc numbers
ALTER TABLE "nx03_stock_take" ALTER COLUMN "status" TYPE VARCHAR(30);
ALTER TABLE "nx03_stock_take" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
UPDATE "nx03_stock_take" SET "status" = CASE "status"
  WHEN 'D' THEN 'DRAFT'
  WHEN 'C' THEN 'COUNTING'
  WHEN 'P' THEN 'POSTED'
  WHEN 'V' THEN 'CANCELLED'
  ELSE "status"
END;
ALTER TABLE "nx03_stock_take" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "nx03_st" ALTER COLUMN "status" TYPE VARCHAR(30);
ALTER TABLE "nx03_st" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
UPDATE "nx03_st" SET "status" = CASE "status"
  WHEN 'D' THEN 'DRAFT'
  WHEN 'P' THEN 'RECEIVED'
  WHEN 'V' THEN 'CANCELLED'
  ELSE "status"
END;
ALTER TABLE "nx03_st" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
