-- Baseline: PostgreSQL sequences + gen_*_id() used by @default(dbgenerated(...)) in schema.prisma
-- Applied at the start of the init migration (before CREATE TABLE).

-- =======================================================
-- NX00
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS seq_nx00_user_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_user_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00USER' || LPAD(nextval('seq_nx00_user_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_role_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_role_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00ROLE' || LPAD(nextval('seq_nx00_role_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_user_role_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_user_role_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00USRO' || LPAD(nextval('seq_nx00_user_role_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_view_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_view_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00VIEW' || LPAD(nextval('seq_nx00_view_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_role_view_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_role_view_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00ROVI' || LPAD(nextval('seq_nx00_role_view_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_part_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_part_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PART' || LPAD(nextval('seq_nx00_part_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_brand_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_brand_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BRAN' || LPAD(nextval('seq_nx00_brand_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_warehouse_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_warehouse_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00WARE' || LPAD(nextval('seq_nx00_warehouse_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_location_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_location_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00LOCA' || LPAD(nextval('seq_nx00_location_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_partner_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_partner_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PTNR' || LPAD(nextval('seq_nx00_partner_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_audit_log_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_audit_log_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00AULO' || LPAD(nextval('seq_nx00_audit_log_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =======================================================
-- NX99 & NX01
-- =======================================================
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

-- =======================================================
-- NX07 & NX08
-- =======================================================
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

-- =======================================================
-- NX09
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS nx09_stock_balance_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx09_stock_txn_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx09_stock_balance_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx09_stock_balance_seq');
  RETURN 'NX09SBAL' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx09_stock_txn_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx09_stock_txn_seq');
  RETURN 'NX09STXN' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- =======================================================
-- NX02嚚X06
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS nx02_dept_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx03_emp_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx04_unit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx05_cat_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx06_prod_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx02_dept_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx02_dept_seq');
  RETURN 'NX02DEPT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx03_emp_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx03_emp_seq');
  RETURN 'NX03EMPL' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx04_unit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx04_unit_seq');
  RETURN 'NX04UNIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx05_cat_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx05_cat_seq');
  RETURN 'NX05CAT' || LPAD(seq_val::TEXT, 8, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx06_prod_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx06_prod_seq');
  RETURN 'NX06PROD' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- CreateTable
CREATE TABLE "nx00_user" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_user_id(),
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    "tenant_id" VARCHAR(15),

    CONSTRAINT "nx00_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_role" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_role_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_user_role" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_user_role_id(),
    "user_id" VARCHAR(15) NOT NULL,
    "role_id" VARCHAR(15) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" VARCHAR(15),
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nx00_user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_view" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_view_id(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "module_code" VARCHAR(10) NOT NULL,
    "path" VARCHAR(200) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_role_view" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_role_view_id(),
    "role_id" VARCHAR(15) NOT NULL,
    "view_id" VARCHAR(15) NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT true,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_export" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" VARCHAR(15),
    "revoked_at" TIMESTAMP(3),
    "revoked_by" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_role_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_part" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_part_id(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "brand_id" VARCHAR(15),
    "spec" VARCHAR(200),
    "uom" VARCHAR(10) NOT NULL DEFAULT 'pcs',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_brand" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_brand_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "origin_country" VARCHAR(50),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_warehouse" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_warehouse_id(),
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_location" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_location_id(),
    "warehouse_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100),
    "zone" VARCHAR(20),
    "rack" VARCHAR(20),
    "level_no" INTEGER,
    "bin_no" VARCHAR(20),
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_partner" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_partner_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "partner_type" VARCHAR(10) NOT NULL DEFAULT 'BOTH',
    "contact_name" VARCHAR(50),
    "phone" VARCHAR(30),
    "mobile" VARCHAR(30),
    "email" VARCHAR(100),
    "address" VARCHAR(200),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_audit_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_audit_log_id(),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" VARCHAR(15) NOT NULL,
    "module_code" VARCHAR(10) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "entity_table" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(20),
    "entity_code" VARCHAR(50),
    "summary" VARCHAR(200),
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_addr" VARCHAR(45),
    "user_agent" VARCHAR(200),

    CONSTRAINT "nx00_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "nx09_stock_balance" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_stock_balance_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx09_stock_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_stock_txn" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_stock_txn_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txn_type" VARCHAR(1) NOT NULL,
    "ref_type" VARCHAR(10) NOT NULL,
    "ref_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "qty_delta" DECIMAL(14,4) NOT NULL,
    "before_qty" DECIMAL(14,4) NOT NULL,
    "after_qty" DECIMAL(14,4) NOT NULL,
    "remark" VARCHAR(200),
    "created_by" VARCHAR(15),
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx09_stock_txn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_dept" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_dept_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "dept_code" VARCHAR(20) NOT NULL,
    "dept_name" VARCHAR(50) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx02_dept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_emp" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_emp_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "emp_code" VARCHAR(20) NOT NULL,
    "emp_name" VARCHAR(50) NOT NULL,
    "dept_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(50),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx03_emp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx04_unit" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_unit_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "unit_code" VARCHAR(20) NOT NULL,
    "unit_name" VARCHAR(50) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx04_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_category" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_cat_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "category_code" VARCHAR(20) NOT NULL,
    "category_name" VARCHAR(50) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx05_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx06_product" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx06_prod_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "product_code" VARCHAR(50) NOT NULL,
    "product_name" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(100),
    "unit_id" VARCHAR(15) NOT NULL,
    "category_id" VARCHAR(15) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx06_product_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "nx00_user_username_key" ON "nx00_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_role_code_key" ON "nx00_role"("code");

-- CreateIndex
CREATE INDEX "nx00_user_role_user_id_idx" ON "nx00_user_role"("user_id");

-- CreateIndex
CREATE INDEX "nx00_user_role_role_id_idx" ON "nx00_user_role"("role_id");

-- CreateIndex
CREATE INDEX "nx00_user_role_is_active_idx" ON "nx00_user_role"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_user_role_user_id_role_id_key" ON "nx00_user_role"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_view_code_key" ON "nx00_view"("code");

-- CreateIndex
CREATE INDEX "nx00_view_module_code_idx" ON "nx00_view"("module_code");

-- CreateIndex
CREATE INDEX "nx00_view_is_active_idx" ON "nx00_view"("is_active");

-- CreateIndex
CREATE INDEX "nx00_role_view_role_id_idx" ON "nx00_role_view"("role_id");

-- CreateIndex
CREATE INDEX "nx00_role_view_view_id_idx" ON "nx00_role_view"("view_id");

-- CreateIndex
CREATE INDEX "nx00_role_view_is_active_idx" ON "nx00_role_view"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_role_view_role_id_view_id_key" ON "nx00_role_view"("role_id", "view_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_part_code_key" ON "nx00_part"("code");

-- CreateIndex
CREATE INDEX "nx00_part_brand_id_idx" ON "nx00_part"("brand_id");

-- CreateIndex
CREATE INDEX "nx00_part_is_active_idx" ON "nx00_part"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_brand_code_key" ON "nx00_brand"("code");

-- CreateIndex
CREATE INDEX "nx00_brand_is_active_idx" ON "nx00_brand"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_warehouse_code_key" ON "nx00_warehouse"("code");

-- CreateIndex
CREATE INDEX "nx00_warehouse_is_active_idx" ON "nx00_warehouse"("is_active");

-- CreateIndex
CREATE INDEX "nx00_location_warehouse_id_idx" ON "nx00_location"("warehouse_id");

-- CreateIndex
CREATE INDEX "nx00_location_is_active_idx" ON "nx00_location"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_location_warehouse_id_code_key" ON "nx00_location"("warehouse_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_partner_code_key" ON "nx00_partner"("code");

-- CreateIndex
CREATE INDEX "nx00_partner_is_active_idx" ON "nx00_partner"("is_active");

-- CreateIndex
CREATE INDEX "nx00_partner_partner_type_idx" ON "nx00_partner"("partner_type");

-- CreateIndex
CREATE INDEX "nx00_audit_log_occurred_at_idx" ON "nx00_audit_log"("occurred_at");

-- CreateIndex
CREATE INDEX "nx00_audit_log_actor_user_id_idx" ON "nx00_audit_log"("actor_user_id");

-- CreateIndex
CREATE INDEX "nx00_audit_log_module_code_idx" ON "nx00_audit_log"("module_code");

-- CreateIndex
CREATE INDEX "nx00_audit_log_entity_table_idx" ON "nx00_audit_log"("entity_table");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_tenant_code_key" ON "nx99_tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_rfq_doc_no_key" ON "nx01_rfq"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_po_doc_no_key" ON "nx01_po"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx07_quote_doc_no_key" ON "nx07_quote"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx08_sales_order_doc_no_key" ON "nx08_sales_order"("doc_no");

-- CreateIndex
CREATE INDEX "nx09_stock_balance_warehouse_id_idx" ON "nx09_stock_balance"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx09_stock_balance_tenant_id_warehouse_id_part_id_key" ON "nx09_stock_balance"("tenant_id", "warehouse_id", "part_id");

-- CreateIndex
CREATE INDEX "nx09_stock_txn_occurred_at_idx" ON "nx09_stock_txn"("occurred_at");

-- CreateIndex
CREATE INDEX "nx09_stock_txn_warehouse_id_idx" ON "nx09_stock_txn"("warehouse_id");

-- CreateIndex
CREATE INDEX "nx09_stock_txn_part_id_idx" ON "nx09_stock_txn"("part_id");

-- CreateIndex
CREATE INDEX "nx02_dept_tenant_id_idx" ON "nx02_dept"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx02_dept_tenant_id_dept_code_key" ON "nx02_dept"("tenant_id", "dept_code");

-- CreateIndex
CREATE INDEX "nx03_emp_tenant_id_idx" ON "nx03_emp"("tenant_id");

-- CreateIndex
CREATE INDEX "nx03_emp_dept_id_idx" ON "nx03_emp"("dept_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx03_emp_tenant_id_emp_code_key" ON "nx03_emp"("tenant_id", "emp_code");

-- CreateIndex
CREATE INDEX "nx04_unit_tenant_id_idx" ON "nx04_unit"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx04_unit_tenant_id_unit_code_key" ON "nx04_unit"("tenant_id", "unit_code");

-- CreateIndex
CREATE INDEX "nx05_category_tenant_id_idx" ON "nx05_category"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_category_tenant_id_category_code_key" ON "nx05_category"("tenant_id", "category_code");

-- CreateIndex
CREATE INDEX "nx06_product_tenant_id_idx" ON "nx06_product"("tenant_id");

-- CreateIndex
CREATE INDEX "nx06_product_unit_id_idx" ON "nx06_product"("unit_id");

-- CreateIndex
CREATE INDEX "nx06_product_category_id_idx" ON "nx06_product"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx06_product_tenant_id_product_code_key" ON "nx06_product"("tenant_id", "product_code");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_plan_code_key" ON "nx99_plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_product_module_code_key" ON "nx99_product_module"("code");

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role" ADD CONSTRAINT "nx00_role_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role" ADD CONSTRAINT "nx00_role_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx00_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_view" ADD CONSTRAINT "nx00_view_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_view" ADD CONSTRAINT "nx00_view_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx00_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "nx00_view"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "nx00_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_brand" ADD CONSTRAINT "nx00_brand_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_brand" ADD CONSTRAINT "nx00_brand_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_warehouse" ADD CONSTRAINT "nx00_warehouse_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_warehouse" ADD CONSTRAINT "nx00_warehouse_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_partner" ADD CONSTRAINT "nx00_partner_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_partner" ADD CONSTRAINT "nx00_partner_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_audit_log" ADD CONSTRAINT "nx00_audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "nx09_stock_balance" ADD CONSTRAINT "nx09_stock_balance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_stock_balance" ADD CONSTRAINT "nx09_stock_balance_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_stock_balance" ADD CONSTRAINT "nx09_stock_balance_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_stock_txn" ADD CONSTRAINT "nx09_stock_txn_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_stock_txn" ADD CONSTRAINT "nx09_stock_txn_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_stock_txn" ADD CONSTRAINT "nx09_stock_txn_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_dept" ADD CONSTRAINT "nx02_dept_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_dept" ADD CONSTRAINT "nx02_dept_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_dept" ADD CONSTRAINT "nx02_dept_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_emp" ADD CONSTRAINT "nx03_emp_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_emp" ADD CONSTRAINT "nx03_emp_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "nx02_dept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_emp" ADD CONSTRAINT "nx03_emp_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_emp" ADD CONSTRAINT "nx03_emp_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_unit" ADD CONSTRAINT "nx04_unit_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_unit" ADD CONSTRAINT "nx04_unit_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_unit" ADD CONSTRAINT "nx04_unit_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_category" ADD CONSTRAINT "nx05_category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_category" ADD CONSTRAINT "nx05_category_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_category" ADD CONSTRAINT "nx05_category_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "nx04_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "nx05_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "nx99_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription_item" ADD CONSTRAINT "nx99_subscription_item_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "nx99_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_product_module_map" ADD CONSTRAINT "nx99_product_module_map_product_module_id_fkey" FOREIGN KEY ("product_module_id") REFERENCES "nx99_product_module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
