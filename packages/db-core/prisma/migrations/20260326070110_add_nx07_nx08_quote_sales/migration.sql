-- AlterTable
ALTER TABLE "nx02_dept" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "nx03_emp" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "nx04_unit" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "nx05_category" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "nx06_product" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- NX07/NX08 ID sequences & generator functions (must be created before tables use them)
CREATE SEQUENCE IF NOT EXISTS nx07_quote_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx07_quote_item_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx08_sales_order_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx08_sales_order_item_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx07_quote_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx07_quote_seq');
  RETURN 'NX07QUOT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx07_quote_item_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx07_quote_item_seq');
  RETURN 'NX07QITM' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx08_sales_order_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx08_sales_order_seq');
  RETURN 'NX08SORD' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx08_sales_order_item_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx08_sales_order_item_seq');
  RETURN 'NX08SOIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- CreateTable
CREATE TABLE "nx07_quote" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_quote_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(15) NOT NULL,
    "quote_date" DATE NOT NULL,
    "customer_id" VARCHAR(15) NOT NULL,
    "rfq_id" VARCHAR(15),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "status" VARCHAR(20) NOT NULL DEFAULT 'D',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx07_quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_quote_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_quote_item_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "quote_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "rfq_item_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_cost_snapshot" DECIMAL(14,4) NOT NULL,
    "unit_price_snapshot" DECIMAL(14,4) NOT NULL,
    "markup_type" VARCHAR(1),
    "markup_value" DECIMAL(14,4),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "lead_time_days" INTEGER,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx07_quote_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_sales_order" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_sales_order_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(15) NOT NULL,
    "so_date" DATE NOT NULL,
    "customer_id" VARCHAR(15) NOT NULL,
    "quote_id" VARCHAR(15) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "status" VARCHAR(20) NOT NULL DEFAULT 'D',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx08_sales_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_sales_order_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_sales_order_item_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "sales_order_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "quote_item_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_price_snapshot" DECIMAL(14,4) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "location_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx08_sales_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx07_quote_doc_no_key" ON "nx07_quote"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx08_sales_order_doc_no_key" ON "nx08_sales_order"("doc_no");

-- AddForeignKey
ALTER TABLE "nx07_quote" ADD CONSTRAINT "nx07_quote_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_quote" ADD CONSTRAINT "nx07_quote_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_quote" ADD CONSTRAINT "nx07_quote_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "nx01_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_quote_item" ADD CONSTRAINT "nx07_quote_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_quote_item" ADD CONSTRAINT "nx07_quote_item_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "nx07_quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_quote_item" ADD CONSTRAINT "nx07_quote_item_rfq_item_id_fkey" FOREIGN KEY ("rfq_item_id") REFERENCES "nx01_rfq_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_quote_item" ADD CONSTRAINT "nx07_quote_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_order" ADD CONSTRAINT "nx08_sales_order_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_order" ADD CONSTRAINT "nx08_sales_order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_order" ADD CONSTRAINT "nx08_sales_order_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "nx07_quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_order_item" ADD CONSTRAINT "nx08_sales_order_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_order_item" ADD CONSTRAINT "nx08_sales_order_item_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "nx08_sales_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_order_item" ADD CONSTRAINT "nx08_sales_order_item_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "nx07_quote_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_order_item" ADD CONSTRAINT "nx08_sales_order_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_order_item" ADD CONSTRAINT "nx08_sales_order_item_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_order_item" ADD CONSTRAINT "nx08_sales_order_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
