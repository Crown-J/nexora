-- NX99 & NX01 sequences & ID generator functions (must be created before tables use them)
CREATE SEQUENCE IF NOT EXISTS nx99_tant_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_plan_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_subs_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_suit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmm_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_rfqo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_rfit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_poht_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_poit_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx99_tant_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_tant_seq');
  RETURN 'NX99TANT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_plan_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_plan_seq');
  RETURN 'NX99PLAN' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_subs_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_subs_seq');
  RETURN 'NX99SUBS' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_suit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_suit_seq');
  RETURN 'NX99SUIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_prmo_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_prmo_seq');
  RETURN 'NX99PRMO' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_prmm_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_prmm_seq');
  RETURN 'NX99PRMM' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_rfqo_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_rfqo_seq');
  RETURN 'NX01RFQO' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_rfit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_rfit_seq');
  RETURN 'NX01RFIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_poht_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_poht_seq');
  RETURN 'NX01POHT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_poit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_poit_seq');
  RETURN 'NX01POIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- AlterTable
ALTER TABLE "nx00_user" ADD COLUMN     "tenant_id" VARCHAR(15);

CREATE TABLE "nx99_tenant" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_tant_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(1) NOT NULL,
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_rfq" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_rfqo_id(),
    "tenant_id" VARCHAR(15),
    "doc_no" VARCHAR(15) NOT NULL,
    "rfq_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15) NOT NULL,
    "contact_name" VARCHAR(50),
    "contact_phone" VARCHAR(30),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "status" VARCHAR(20) NOT NULL DEFAULT 'D',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),

    CONSTRAINT "nx01_rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_rfq_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_rfit_id(),
    "tenant_id" VARCHAR(15),
    "rfq_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_price" DECIMAL(14,4),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "lead_time_days" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'P',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx01_rfq_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_po" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_poht_id(),
    "tenant_id" VARCHAR(15),
    "doc_no" VARCHAR(15) NOT NULL,
    "po_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15) NOT NULL,
    "rfq_id" VARCHAR(15),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),

    CONSTRAINT "nx01_po_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_po_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_poit_id(),
    "tenant_id" VARCHAR(15),
    "po_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "location_id" VARCHAR(15),
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_cost" DECIMAL(14,4) NOT NULL,
    "line_amount" DECIMAL(14,4) NOT NULL,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx01_po_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_plan" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_plan_id(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "level_no" INTEGER NOT NULL,
    "base_fee_month" INTEGER NOT NULL,
    "seat_fee_month" INTEGER NOT NULL,
    "min_seats" INTEGER NOT NULL,
    "max_seats" INTEGER NOT NULL,
    "billing_default" VARCHAR(10) NOT NULL,
    "year_discount_type" VARCHAR(1) NOT NULL,
    "year_discount_value" INTEGER NOT NULL,
    "year_price_override" INTEGER,
    "remark" VARCHAR(200),
    "sort_no" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_subscription" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_subs_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "plan_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(1) NOT NULL,
    "billing_cycle" VARCHAR(1) NOT NULL,
    "seats" INTEGER NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "auto_renew" BOOLEAN NOT NULL,
    "base_fee_snapshot" INTEGER NOT NULL,
    "seat_fee_snapshot" INTEGER NOT NULL,
    "discount_type_snapshot" VARCHAR(1) NOT NULL,
    "discount_value_snapshot" INTEGER NOT NULL,
    "subtotal_snapshot" INTEGER NOT NULL,
    "discount_amount_snapshot" INTEGER NOT NULL,
    "total_snapshot" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_subscription_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_suit_id(),
    "subscription_id" VARCHAR(15) NOT NULL,
    "item_type" VARCHAR(20) NOT NULL,
    "ref_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "is_included" BOOLEAN NOT NULL,
    "billing_cycle" VARCHAR(1) NOT NULL,
    "price_snapshot" INTEGER NOT NULL,
    "discount_type_snapshot" VARCHAR(1) NOT NULL,
    "discount_value_snapshot" INTEGER NOT NULL,
    "total_snapshot" INTEGER NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_subscription_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_product_module" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_prmo_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "module_level" VARCHAR(1) NOT NULL,
    "applicable_plan_code" VARCHAR(30) NOT NULL,
    "billing_type" VARCHAR(1) NOT NULL,
    "monthly_fee" INTEGER NOT NULL,
    "is_bundle_default" BOOLEAN NOT NULL,
    "description" TEXT,
    "sort_no" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_product_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_product_module_map" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_prmm_id(),
    "product_module_id" VARCHAR(15) NOT NULL,
    "app_module_code" VARCHAR(10) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_product_module_map_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx99_tenant_code_key" ON "nx99_tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_rfq_doc_no_key" ON "nx01_rfq"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_po_doc_no_key" ON "nx01_po"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_plan_code_key" ON "nx99_plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_product_module_code_key" ON "nx99_product_module"("code");

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_rfq" ADD CONSTRAINT "nx01_rfq_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_rfq" ADD CONSTRAINT "nx01_rfq_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_rfq_item" ADD CONSTRAINT "nx01_rfq_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_rfq_item" ADD CONSTRAINT "nx01_rfq_item_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "nx01_rfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_rfq_item" ADD CONSTRAINT "nx01_rfq_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_po" ADD CONSTRAINT "nx01_po_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_po" ADD CONSTRAINT "nx01_po_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "nx01_po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "nx99_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription_item" ADD CONSTRAINT "nx99_subscription_item_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "nx99_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_product_module_map" ADD CONSTRAINT "nx99_product_module_map_product_module_id_fkey" FOREIGN KEY ("product_module_id") REFERENCES "nx99_product_module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
