-- packages/db-core/prisma/_ddl_fragment.sql
-- ============================================================================
-- 這個檔案是 baseline migration (20260413120000_spec_v7_baseline) 的 source
-- 快照，反映 baseline 建立當下的 schema 狀態。
--
-- ⚠️ 本檔案是歷史快照，不應與 schema.prisma 同步更新。
--
-- 後續 schema 變更請走新 migration，例如：
--   - 20260421132744_fix_tenant_scoped_unique：修正 4 個表的 unique 索引
--     (nx01_car_brand / nx01_part_group / nx05_account_code / nx10_medal_level)
-- ============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "nx01_audit_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_audit_log_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
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

    CONSTRAINT "nx01_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_brand_code_rule" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_brand_code_rule_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_brand_id" VARCHAR(15) NOT NULL,
    "name" VARCHAR(15) NOT NULL,
    "seg1" INTEGER NOT NULL DEFAULT 0,
    "seg2" INTEGER NOT NULL DEFAULT 0,
    "seg3" INTEGER NOT NULL DEFAULT 0,
    "seg4" INTEGER NOT NULL DEFAULT 0,
    "seg5" INTEGER NOT NULL DEFAULT 0,
    "code_format" VARCHAR(20) NOT NULL DEFAULT '1-2-3-4-5',
    "brand_sort" VARCHAR(5) NOT NULL DEFAULT '12345',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_brand_code_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_bulletin" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_bulletin_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "content" TEXT,
    "type" VARCHAR(1) NOT NULL DEFAULT 'C',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "expired_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_bulletin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_calendar_event" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_calendar_event_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "type" VARCHAR(1) NOT NULL,
    "date_start" TIMESTAMP(3) NOT NULL,
    "date_end" TIMESTAMP(3) NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "order_type" VARCHAR(2),
    "order_doc_no" VARCHAR(16),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_car_brand" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_car_brand_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "country_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_car_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_country" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_country_id(),
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_currency" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_currency_id(),
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(5),
    "decimal_places" INTEGER NOT NULL DEFAULT 2,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_customer_grade" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_customer_grade_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "margin_pct" DECIMAL(5,2) NOT NULL,
    "sort_no" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_customer_grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_department" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_department_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_discount_code" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_discount_code_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "discount_type" VARCHAR(1) NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "managed_by" VARCHAR(1) NOT NULL DEFAULT 'P',
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_discount_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_kpi_record" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_kpi_record_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "kpi_template_id" VARCHAR(15) NOT NULL,
    "kpi_target_id" VARCHAR(15),
    "user_id" VARCHAR(15) NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_value" INTEGER,
    "actual_value" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "target_value" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "achievement_rate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "calc_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nx01_kpi_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_kpi_target" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_kpi_target_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "kpi_template_id" VARCHAR(15) NOT NULL,
    "target_type" VARCHAR(1) NOT NULL DEFAULT 'R',
    "role_id" VARCHAR(15),
    "user_id" VARCHAR(15),
    "period_year" INTEGER NOT NULL,
    "period_value" INTEGER,
    "target_value" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_kpi_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_kpi_template" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_kpi_template_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "applicable_role_code" VARCHAR(20) NOT NULL,
    "source_module" VARCHAR(10) NOT NULL,
    "source_table" VARCHAR(50) NOT NULL,
    "source_field" VARCHAR(50) NOT NULL,
    "calc_method" VARCHAR(10) NOT NULL,
    "period_type" VARCHAR(1) NOT NULL DEFAULT 'M',
    "target_direction" VARCHAR(3) NOT NULL DEFAULT 'GTE',
    "unit" VARCHAR(10) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_kpi_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_location" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_location_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
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
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_part" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code_rule_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "is_oem" BOOLEAN NOT NULL DEFAULT true,
    "sec_code" VARCHAR(50),
    "seg1" VARCHAR(10),
    "seg2" VARCHAR(10),
    "seg3" VARCHAR(10),
    "seg4" VARCHAR(10),
    "seg5" VARCHAR(10),
    "country_id" VARCHAR(15),
    "part_brand_id" VARCHAR(15),
    "type" VARCHAR(1) DEFAULT 'A',
    "part_group_id" VARCHAR(15),
    "spec" VARCHAR(200),
    "uom" VARCHAR(10) NOT NULL DEFAULT 'pcs',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "return_policy" VARCHAR(1) NOT NULL DEFAULT 'S',
    "warranty_months" INTEGER NOT NULL DEFAULT 0,
    "price_a" DECIMAL(14,4) DEFAULT 0,
    "price_b" DECIMAL(14,4) DEFAULT 0,
    "price_c" DECIMAL(14,4) DEFAULT 0,
    "price_d" DECIMAL(14,4) DEFAULT 0,
    "price_updated_at" TIMESTAMP(3),
    "price_updated_by" VARCHAR(15),

    CONSTRAINT "nx01_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_part_brand" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_brand_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "country_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_part_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_part_group" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_group_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_part_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_part_relation" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_relation_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_id_from" VARCHAR(15) NOT NULL,
    "part_id_to" VARCHAR(15) NOT NULL,
    "relation_type" VARCHAR(1) NOT NULL,
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_part_relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_partner" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_partner_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "partner_type" VARCHAR(1) NOT NULL DEFAULT 'BOTH',
    "contact_name" VARCHAR(50),
    "phone" VARCHAR(30),
    "mobile" VARCHAR(30),
    "email" VARCHAR(100),
    "address" VARCHAR(200),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "tax_id" VARCHAR(20),
    "payment_term_domestic" VARCHAR(10) NOT NULL DEFAULT 'NET30',
    "customer_grade_id" VARCHAR(15),
    "credit_limit" DECIMAL(15,2) DEFAULT 0,
    "credit_status" VARCHAR(1) NOT NULL DEFAULT 'N',
    "payment_term_import" VARCHAR(5) DEFAULT 'TT',
    "incoterm" VARCHAR(5) DEFAULT 'FOB',

    CONSTRAINT "nx01_partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_role" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_role_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_role_view" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_role_view_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
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
    "can_approve" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "nx01_role_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_team" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_team_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "department_id" VARCHAR(15) NOT NULL,
    "parent_team_id" VARCHAR(15),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "warehouse_id" VARCHAR(15),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_user" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_user_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "employee_id" VARCHAR(15),
    "user_account" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "user_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_user_role" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_user_role_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "role_id" VARCHAR(15) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" VARCHAR(15),
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nx01_user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_user_team" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_user_team_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "team_id" VARCHAR(15) NOT NULL,
    "is_leader" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_user_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_user_warehouse" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_user_warehouse_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" VARCHAR(15),
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nx01_user_warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_view" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_view_id(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "module_code" VARCHAR(10) NOT NULL,
    "path" VARCHAR(200) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_warehouse" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_warehouse_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "warehouse_type_id" VARCHAR(15),

    CONSTRAINT "nx01_warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_warehouse_type" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_warehouse_type_id(),
    "code" VARCHAR(1) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "flow_mode" VARCHAR(1) NOT NULL,
    "description" VARCHAR(200),
    "sort_no" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nx01_warehouse_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_demand" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_demand_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "demand_type" VARCHAR(1) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "customer_id" VARCHAR(15),
    "expected_date" DATE,
    "status" VARCHAR(1) NOT NULL DEFAULT 'O',
    "ignore_reason" VARCHAR(200),
    "ref_rfq_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx02_demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_po" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_po_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "po_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15) NOT NULL,
    "rfq_id" VARCHAR(15),
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(14,2) NOT NULL DEFAULT 5,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expected_date" DATE,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),
    "approved_at" TIMESTAMP(3),
    "approved_by" VARCHAR(15),
    "sent_at" TIMESTAMP(3),
    "supplier_confirmed_at" TIMESTAMP(3),
    "reject_reason" VARCHAR(200),
    "purchase_type" VARCHAR(1) NOT NULL DEFAULT 'D',
    "vessel_no" VARCHAR(50),
    "container_no" VARCHAR(50),
    "eta" DATE,
    "payment_term_import" VARCHAR(5),
    "incoterm" VARCHAR(5) DEFAULT 'FOB',

    CONSTRAINT "nx02_po_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_po_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_po_item_id(),
    "po_id" VARCHAR(15) NOT NULL,
    "rfq_item_id" VARCHAR(15),
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "received_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expected_date" DATE,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx02_po_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_pr" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_pr_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "pr_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15) NOT NULL,
    "rr_id" VARCHAR(15),
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),
    "approved_at" TIMESTAMP(3),
    "approved_by" VARCHAR(15),
    "reject_reason" VARCHAR(200),
    "payment_status" VARCHAR(1) NOT NULL DEFAULT 'U',

    CONSTRAINT "nx02_pr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_pr_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_pr_item_id(),
    "pr_id" VARCHAR(15) NOT NULL,
    "rr_item_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "location_id" VARCHAR(15),
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "return_reason" VARCHAR(1) NOT NULL DEFAULT 'O',

    CONSTRAINT "nx02_pr_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_rfq" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_rfq_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "rfq_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15),
    "contact_name" VARCHAR(50),
    "contact_phone" VARCHAR(30),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),
    "rfq_type" VARCHAR(1) NOT NULL DEFAULT 'G',
    "rfq_reason" VARCHAR(50),
    "warehouse_id" VARCHAR(15) NOT NULL,
    "valid_until" DATE,
    "demand_id" VARCHAR(15),

    CONSTRAINT "nx02_rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_rfq_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_rfq_item_id(),
    "rfq_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(14,4),
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "lead_time_days" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'P',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "demand_item_id" VARCHAR(15),
    "is_adopted" BOOLEAN NOT NULL DEFAULT true,
    "reject_reason" VARCHAR(200),

    CONSTRAINT "nx02_rfq_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_rr" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_rr_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "rr_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15) NOT NULL,
    "rfq_id" VARCHAR(15),
    "po_id" VARCHAR(15),
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),
    "ti_id" VARCHAR(15),
    "verified_at" TIMESTAMP(3),
    "verified_by" VARCHAR(15),
    "approved_at" TIMESTAMP(3),
    "approved_by" VARCHAR(15),

    CONSTRAINT "nx02_rr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_rr_import" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_rr_import_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "rr_id" VARCHAR(15) NOT NULL,
    "po_id" VARCHAR(15) NOT NULL,
    "vessel_no" VARCHAR(50),
    "container_no" VARCHAR(50),
    "eta" DATE,
    "parcel_length" DECIMAL(8,2),
    "parcel_width" DECIMAL(8,2),
    "parcel_height" DECIMAL(8,2),
    "parcel_weight" DECIMAL(8,2),
    "freight_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "customs_duty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "customs_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "storage_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "other_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "other_fee_desc" VARCHAR(200),
    "total_import_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "cost_per_unit" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "currency_id" VARCHAR(10) NOT NULL,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "incoterm" VARCHAR(5) NOT NULL DEFAULT 'FOB',

    CONSTRAINT "nx02_rr_import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_rr_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_rr_item_id(),
    "rr_id" VARCHAR(15) NOT NULL,
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
    "expected_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "actual_qty" DECIMAL(14,4),
    "defect_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "defect_type" VARCHAR(1),
    "defect_desc" VARCHAR(200),
    "batch_no" VARCHAR(30),
    "warranty_expired_at" DATE,

    CONSTRAINT "nx02_rr_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_ti" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_ti_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "ti_date" DATE NOT NULL,
    "partner_id" VARCHAR(15) NOT NULL,
    "rfq_id" VARCHAR(15),
    "currency_id" VARCHAR(10) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),

    CONSTRAINT "nx02_ti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx02_ti_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_ti_item_id(),
    "ti_id" VARCHAR(15) NOT NULL,
    "rfq_item_id" VARCHAR(15),
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "location_id" VARCHAR(15),
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx02_ti_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_auto_replenish" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_auto_replenish_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "from_warehouse_id" VARCHAR(15) NOT NULL,
    "to_warehouse_id" VARCHAR(15) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_auto_replenish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_init" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_init_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "init_date" DATE NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),

    CONSTRAINT "nx03_init_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_init_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_init_item_id(),
    "init_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "location_id" VARCHAR(15),
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(14,2) NOT NULL,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_init_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_parcel" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_parcel_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "pl_id" VARCHAR(15) NOT NULL,
    "parcel_no" VARCHAR(30) NOT NULL,
    "parcel_type" VARCHAR(1) NOT NULL,
    "from_warehouse_id" VARCHAR(15) NOT NULL,
    "to_warehouse_id" VARCHAR(15),
    "to_partner_id" VARCHAR(15),
    "logistics_tracking_no" VARCHAR(50),
    "weight_kg" DECIMAL(8,2),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_part_stock_setting" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_part_stock_setting_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "min_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "max_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reorder_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_part_stock_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_pk" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_pk_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "pk_date" DATE NOT NULL,
    "trigger_source" VARCHAR(1) NOT NULL,
    "delivery_type" VARCHAR(1) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "pickup_code" VARCHAR(20),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_pk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_pk_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_pk_item_id(),
    "pk_id" VARCHAR(15) NOT NULL,
    "ref_so_id" VARCHAR(15),
    "ref_so_item_id" VARCHAR(15),
    "ref_st_id" VARCHAR(15),
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "location_id" VARCHAR(15),
    "qty" DECIMAL(14,4) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "not_found_reason" VARCHAR(200),
    "label_checked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_pk_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_pl" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_pl_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "pl_date" DATE NOT NULL,
    "pk_id" VARCHAR(15) NOT NULL,
    "pl_type" VARCHAR(1) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "logistics_provider" VARCHAR(50),
    "logistics_tracking_no" VARCHAR(50),
    "shipped_at" TIMESTAMP(3),
    "shipped_by" VARCHAR(15),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_pl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_pl_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_pl_item_id(),
    "pl_id" VARCHAR(15) NOT NULL,
    "parcel_id" VARCHAR(15),
    "pk_item_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_pl_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_shortage" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_shortage_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "on_hand_qty" DECIMAL(14,4) NOT NULL,
    "min_qty" DECIMAL(14,4) NOT NULL,
    "shortage_qty" DECIMAL(14,4) NOT NULL,
    "suggest_order_qty" DECIMAL(14,4) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'O',
    "ref_rfq_id" VARCHAR(15),
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_shortage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_st" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_st_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "st_date" DATE NOT NULL,
    "from_warehouse_id" VARCHAR(15) NOT NULL,
    "to_warehouse_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(1) NOT NULL,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),
    "st_type" VARCHAR(1) NOT NULL DEFAULT 'M',
    "trigger_source" VARCHAR(1),
    "ref_so_id" VARCHAR(15),
    "ref_rr_id" VARCHAR(15),
    "approved_at" TIMESTAMP(3),
    "approved_by" VARCHAR(15),
    "received_at" TIMESTAMP(3),
    "received_by" VARCHAR(15),

    CONSTRAINT "nx03_st_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_st_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_st_item_id(),
    "st_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "part_brand_id" VARCHAR(15),
    "from_location_id" VARCHAR(15),
    "to_location_id" VARCHAR(15),
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "received_qty" DECIMAL(14,4),

    CONSTRAINT "nx03_st_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_stock_balance" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_stock_balance_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "on_hand_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reserved_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "available_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "in_transit_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "avg_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "stock_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "last_in_at" TIMESTAMP(3),
    "last_out_at" TIMESTAMP(3),
    "last_move_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx03_stock_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_stock_ledger" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_stock_ledger_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "movement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "part_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "location_id" VARCHAR(15) NOT NULL,
    "movement_type" VARCHAR(1) NOT NULL,
    "qty_in" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "qty_out" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "balance_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "source_module" VARCHAR(10) NOT NULL,
    "source_doc_type" VARCHAR(1) NOT NULL,
    "source_doc_id" VARCHAR(15) NOT NULL,
    "source_item_id" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nx03_stock_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_stock_take" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_stock_take_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "stock_take_date" DATE NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "scope_type" VARCHAR(1) NOT NULL DEFAULT 'F',
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),
    "scope_detail" VARCHAR(200),
    "started_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" VARCHAR(15),

    CONSTRAINT "nx03_stock_take_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx03_stock_take_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_stock_take_item_id(),
    "stock_take_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
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
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "counted_at" TIMESTAMP(3),
    "dispose_type" VARCHAR(1),
    "dispose_remark" VARCHAR(200),

    CONSTRAINT "nx03_stock_take_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx04_quote" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_quote_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "quote_date" DATE NOT NULL,
    "customer_id" VARCHAR(15) NOT NULL,
    "customer_grade_id" VARCHAR(15),
    "valid_until" DATE,
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "remark" VARCHAR(200),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),
    "void_reason" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "rfq_id" VARCHAR(15),

    CONSTRAINT "nx04_quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx04_quote_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_quote_item_id(),
    "quote_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "group_no" INTEGER,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "min_price" DECIMAL(14,4),
    "discount_code_id" VARCHAR(15),
    "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_selected" BOOLEAN NOT NULL DEFAULT true,
    "below_min_reason" VARCHAR(200),
    "transferred_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx04_quote_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx04_so" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_so_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "so_date" DATE NOT NULL,
    "customer_id" VARCHAR(15) NOT NULL,
    "quote_id" VARCHAR(15),
    "delivery_type" VARCHAR(1) NOT NULL,
    "source_type" VARCHAR(1) NOT NULL DEFAULT 'S',
    "delivery_address" VARCHAR(200),
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT 'R',
    "payment_term" VARCHAR(10) NOT NULL DEFAULT 'NET30',
    "expected_delivery_date" DATE,
    "cancel_reason" VARCHAR(200),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" VARCHAR(15),
    "completed_at" TIMESTAMP(3),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx04_so_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx04_so_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_so_item_id(),
    "so_id" VARCHAR(15) NOT NULL,
    "quote_item_id" VARCHAR(15),
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "location_id" VARCHAR(15),
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "discount_code_id" VARCHAR(15),
    "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reserved_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "below_min_reason" VARCHAR(200),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "item_status" VARCHAR(2) NOT NULL DEFAULT 'WP',
    "ti_id" VARCHAR(15),
    "st_id" VARCHAR(15),

    CONSTRAINT "nx04_so_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx04_sr" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_sr_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "sr_date" DATE NOT NULL,
    "customer_id" VARCHAR(15) NOT NULL,
    "so_id" VARCHAR(15) NOT NULL,
    "return_method" VARCHAR(1) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "approved_at" TIMESTAMP(3),
    "approved_by" VARCHAR(15),
    "reject_reason" VARCHAR(200),
    "received_at" TIMESTAMP(3),
    "received_by" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx04_sr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx04_sr_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_sr_item_id(),
    "sr_id" VARCHAR(15) NOT NULL,
    "so_item_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "return_policy" VARCHAR(1) NOT NULL,
    "return_type" VARCHAR(1) NOT NULL DEFAULT 'N',
    "return_reason" VARCHAR(1) NOT NULL,
    "concession_reason" VARCHAR(200),
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "location_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx04_sr_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_account_code" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_account_code_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(1) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_account_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_allowance" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_allowance_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "allowance_type" VARCHAR(1) NOT NULL,
    "partner_id" VARCHAR(15) NOT NULL,
    "allowance_date" DATE NOT NULL,
    "ref_ar_id" VARCHAR(15),
    "ref_ap_id" VARCHAR(15),
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "approved_at" TIMESTAMP(3),
    "approved_by" VARCHAR(15),
    "reject_reason" VARCHAR(200),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_allowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_allowance_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_allowance_item_id(),
    "allowance_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "reason" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "disposal_method" VARCHAR(1) NOT NULL DEFAULT 'O',
    "ref_doc_id" VARCHAR(15),
    "ref_doc_type" VARCHAR(2),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_allowance_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_ap_ledger" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_ap_ledger_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "source_type" VARCHAR(2) NOT NULL DEFAULT 'PO',
    "po_id" VARCHAR(15),
    "rr_id" VARCHAR(15),
    "ti_id" VARCHAR(15),
    "supplier_id" VARCHAR(15) NOT NULL,
    "ap_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "original_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT 'O',
    "payment_term" VARCHAR(20) NOT NULL DEFAULT 'NET30',
    "write_off_at" TIMESTAMP(3),
    "write_off_by" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_ap_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_ar_ledger" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_ar_ledger_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "so_id" VARCHAR(15) NOT NULL,
    "customer_id" VARCHAR(15) NOT NULL,
    "ar_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "original_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT 'O',
    "payment_term" VARCHAR(20) NOT NULL DEFAULT 'NET30',
    "overdue_days" INTEGER NOT NULL DEFAULT 0,
    "is_partial_approved" BOOLEAN NOT NULL DEFAULT false,
    "write_off_at" TIMESTAMP(3),
    "write_off_by" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_ar_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_closing" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_closing_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "closing_date" DATE NOT NULL,
    "closed_at" TIMESTAMP(3),
    "closed_by" VARCHAR(15),
    "is_auto" BOOLEAN NOT NULL DEFAULT false,
    "report_printed_at" TIMESTAMP(3),
    "report_printed_by" VARCHAR(15),
    "status" VARCHAR(1) NOT NULL DEFAULT 'C',
    "reopened_at" TIMESTAMP(3),
    "reopened_by" VARCHAR(15),
    "reopen_reason" VARCHAR(200),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_closing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_note" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_note_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "note_type" VARCHAR(2) NOT NULL,
    "direction" VARCHAR(1) NOT NULL,
    "partner_id" VARCHAR(15) NOT NULL,
    "note_no" VARCHAR(50) NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "bank_account" VARCHAR(30),
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'H',
    "cleared_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "bounced_reason" VARCHAR(200),
    "paylog_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_paylog" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_paylog_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "pay_type" VARCHAR(2) NOT NULL,
    "pay_date" DATE NOT NULL,
    "partner_id" VARCHAR(15),
    "ar_id" VARCHAR(15),
    "ap_id" VARCHAR(15),
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency_id" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "pay_method" VARCHAR(2) NOT NULL DEFAULT 'CA',
    "note_id" VARCHAR(15),
    "account_code_id" VARCHAR(15),
    "cash_balance_after" DECIMAL(14,2),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_paylog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx06_dn" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx06_dn_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "dn_date" DATE NOT NULL,
    "driver_user_id" VARCHAR(15) NOT NULL,
    "vehicle_no" VARCHAR(20),
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "departed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx06_dn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx06_dn_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx06_dn_item_id(),
    "dn_id" VARCHAR(15) NOT NULL,
    "stop_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "source_doc_type" VARCHAR(2) NOT NULL,
    "source_doc_id" VARCHAR(15) NOT NULL,
    "source_item_id" VARCHAR(15),
    "parcel_id" VARCHAR(15),
    "part_id" VARCHAR(15),
    "part_no" VARCHAR(50),
    "part_name" VARCHAR(200),
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "delivery_status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "exception_type" VARCHAR(1),
    "exception_reason" VARCHAR(200),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx06_dn_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx06_dn_stop" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx06_dn_stop_id(),
    "dn_id" VARCHAR(15) NOT NULL,
    "stop_no" INTEGER NOT NULL,
    "task_type" VARCHAR(1) NOT NULL,
    "partner_id" VARCHAR(15),
    "warehouse_id" VARCHAR(15),
    "address" VARCHAR(200) NOT NULL,
    "contact_name" VARCHAR(50),
    "contact_phone" VARCHAR(30),
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "arrived_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "signer_type" VARCHAR(1) NOT NULL DEFAULT 'N',
    "signed_at" TIMESTAMP(3),
    "signed_by_name" VARCHAR(50),
    "signature_url" VARCHAR(500),
    "exception_remark" VARCHAR(200),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx06_dn_stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_attendance" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_attendance_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "work_date" DATE NOT NULL,
    "schedule_item_id" VARCHAR(15),
    "clock_in_at" TIMESTAMP(3),
    "clock_out_at" TIMESTAMP(3),
    "clock_in_method" VARCHAR(1),
    "clock_out_method" VARCHAR(1),
    "clock_in_ip" VARCHAR(45),
    "clock_out_ip" VARCHAR(45),
    "line_verified" BOOLEAN NOT NULL DEFAULT false,
    "std_clock_in" TIMESTAMP(3),
    "std_clock_out" TIMESTAMP(3),
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "work_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT 'N',
    "approved_by" VARCHAR(15),
    "approved_at" TIMESTAMP(3),
    "approve_remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx07_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_ip_whitelist" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_ip_whitelist_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15),
    "ip_address" VARCHAR(45) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx07_ip_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_leave_balance" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_leave_balance_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "leave_type_id" VARCHAR(15) NOT NULL,
    "year" INTEGER NOT NULL,
    "entitled_hours" DECIMAL(6,1) NOT NULL DEFAULT 0,
    "used_hours" DECIMAL(6,1) NOT NULL DEFAULT 0,
    "remaining_hours" DECIMAL(6,1) NOT NULL DEFAULT 0,
    "carry_over_hours" DECIMAL(6,1) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx07_leave_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_leave_request" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_leave_request_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "leave_type_id" VARCHAR(15) NOT NULL,
    "request_type" VARCHAR(1) NOT NULL DEFAULT 'S',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "total_hours" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "reason" VARCHAR(200),
    "attachment_url" VARCHAR(500),
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "approved_by" VARCHAR(15),
    "approved_at" TIMESTAMP(3),
    "reject_reason" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx07_leave_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_leave_type" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_leave_type_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "max_days_per_year" DECIMAL(5,1),
    "min_apply_hours" DECIMAL(4,1) NOT NULL DEFAULT 1,
    "need_approval" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx07_leave_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_overtime_request" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_overtime_request_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "work_date" DATE NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "total_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "reason" VARCHAR(200) NOT NULL,
    "ot_type" VARCHAR(1) NOT NULL DEFAULT 'W',
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "approved_by" VARCHAR(15),
    "approved_at" TIMESTAMP(3),
    "reject_reason" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx07_overtime_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_salary_component" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_salary_component_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "comp_type" VARCHAR(1) NOT NULL DEFAULT 'A',
    "calc_method" VARCHAR(1) NOT NULL DEFAULT 'F',
    "default_value" DECIMAL(10,2) DEFAULT 0,
    "kpi_template_id" VARCHAR(15),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx07_salary_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_salary_record" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_salary_record_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "year_month" VARCHAR(7) NOT NULL,
    "base_salary" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "work_days" INTEGER NOT NULL DEFAULT 0,
    "work_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "ot_hours_wd" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ot_hours_holiday" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ot_pay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gross_salary" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deduction_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" VARCHAR(15),
    "paid_at" TIMESTAMP(3),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx07_salary_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_salary_record_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_salary_record_item_id(),
    "salary_record_id" VARCHAR(15) NOT NULL,
    "component_id" VARCHAR(15) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "calc_basis" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nx07_salary_record_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_salary_setting" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_salary_setting_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "emp_type" VARCHAR(1) NOT NULL DEFAULT 'F',
    "base_salary" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "effective_date" DATE NOT NULL,
    "pay_day" INTEGER NOT NULL DEFAULT 5,
    "pay_cycle_start" INTEGER NOT NULL DEFAULT 1,
    "ot_rate_1" DECIMAL(4,2) NOT NULL,
    "ot_rate_2" DECIMAL(4,2) NOT NULL,
    "ot_rate_holiday" DECIMAL(4,2) NOT NULL,
    "ot_rate_below_legal" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx07_salary_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_schedule" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_schedule_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "team_id" VARCHAR(15) NOT NULL,
    "year_month" VARCHAR(7) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "published_at" TIMESTAMP(3),
    "published_by" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx07_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_schedule_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_schedule_item_id(),
    "schedule_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "work_date" DATE NOT NULL,
    "shift_type_id" VARCHAR(15) NOT NULL,
    "swap_user_id" VARCHAR(15),
    "swap_approved" BOOLEAN NOT NULL DEFAULT false,
    "swap_approved_by" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx07_schedule_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx07_shift_type" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_shift_type_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "is_work_day" BOOLEAN NOT NULL DEFAULT true,
    "cross_midnight" BOOLEAN NOT NULL DEFAULT false,
    "color_code" VARCHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx07_shift_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_daily_report" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_daily_report_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "report_date" DATE NOT NULL,
    "done_items" TEXT,
    "kpi_progress" TEXT,
    "exception_items" TEXT,
    "tomorrow_plan" TEXT,
    "submitted_at" TIMESTAMP(3),
    "supervisor_reply" TEXT,
    "replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx08_daily_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_finance_cache" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_finance_cache_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "cache_date" DATE NOT NULL,
    "period_type" VARCHAR(1) NOT NULL DEFAULT 'M',
    "period_value" VARCHAR(7) NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cogs" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gross_profit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gross_margin" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "expense_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expense_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ar_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ar_overdue_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ap_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cash_cycle_days" DECIMAL(6,1) NOT NULL DEFAULT 0,
    "hpa_trend" VARCHAR(1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx08_finance_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_hr_cache" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_hr_cache_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "cache_date" DATE NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "period_type" VARCHAR(1) NOT NULL DEFAULT 'M',
    "period_value" VARCHAR(7) NOT NULL,
    "attendance_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "late_count" INTEGER NOT NULL DEFAULT 0,
    "absence_days" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "ot_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "daily_report_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "kpi_achieve_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "salary_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "talent_quadrant" VARCHAR(2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx08_hr_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_inventory_cache" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_inventory_cache_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "cache_date" DATE NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "period_type" VARCHAR(1) NOT NULL DEFAULT 'M',
    "period_value" VARCHAR(7) NOT NULL,
    "avg_stock_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "sales_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "sales_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "turnover_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "stock_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "days_stagnant" INTEGER NOT NULL DEFAULT 0,
    "bcg_quadrant" VARCHAR(1),
    "gross_margin" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "hpa_trend" VARCHAR(1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx08_inventory_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_monthly_report" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_monthly_report_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "year_month" VARCHAR(7) NOT NULL,
    "kpi_summary" TEXT,
    "achievement_desc" TEXT,
    "daily_report_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "training_hours" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "next_month_goals" TEXT,
    "submitted_at" TIMESTAMP(3),
    "supervisor_score" DECIMAL(5,2),
    "supervisor_reply" TEXT,
    "replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx08_monthly_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_pestel_record" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_pestel_record_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "record_date" DATE NOT NULL,
    "period" VARCHAR(10) NOT NULL,
    "political" TEXT,
    "economic" TEXT,
    "social" TEXT,
    "technological" TEXT,
    "environmental" TEXT,
    "legal" TEXT,
    "impact_summary" TEXT,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx08_pestel_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_purchase_cache" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_purchase_cache_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "cache_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15) NOT NULL,
    "period_type" VARCHAR(1) NOT NULL DEFAULT 'M',
    "period_value" VARCHAR(7) NOT NULL,
    "po_count" INTEGER NOT NULL DEFAULT 0,
    "po_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pr_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "on_time_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "defect_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avg_lead_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "supplier_grade" VARCHAR(1),
    "hpa_trend" VARCHAR(1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx08_purchase_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_sales_cache" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_sales_cache_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "cache_date" DATE NOT NULL,
    "customer_id" VARCHAR(15) NOT NULL,
    "period_type" VARCHAR(1) NOT NULL DEFAULT 'M',
    "period_value" VARCHAR(7) NOT NULL,
    "so_count" INTEGER NOT NULL DEFAULT 0,
    "so_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sr_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gross_profit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gross_margin" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ar_overdue_amt" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "customer_grade" VARCHAR(1),
    "hpa_trend" VARCHAR(1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx08_sales_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx08_swot_record" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx08_swot_record_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "record_date" DATE NOT NULL,
    "period" VARCHAR(10) NOT NULL,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "opportunities" TEXT,
    "threats" TEXT,
    "so_strategy" TEXT,
    "wo_strategy" TEXT,
    "st_strategy" TEXT,
    "wt_strategy" TEXT,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx08_swot_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_document" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_document_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "doc_category" VARCHAR(2) NOT NULL,
    "dept_id" VARCHAR(15),
    "current_ver" VARCHAR(10) NOT NULL DEFAULT '1.0',
    "effective_date" DATE NOT NULL,
    "expired_date" DATE,
    "view_permission" VARCHAR(1) NOT NULL DEFAULT 'A',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx09_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_document_version" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_document_version_id(),
    "document_id" VARCHAR(15) NOT NULL,
    "version_no" VARCHAR(10) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_size_kb" INTEGER,
    "change_summary" VARCHAR(500),
    "print_count" INTEGER NOT NULL DEFAULT 0,
    "last_print_at" TIMESTAMP(3),
    "last_print_by" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx09_document_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_km_article" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_km_article_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "dept_id" VARCHAR(15),
    "category" VARCHAR(2) NOT NULL DEFAULT 'SO',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "context" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expired_at" DATE,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx09_km_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_km_article_tag" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_km_article_tag_id(),
    "article_id" VARCHAR(15) NOT NULL,
    "tag_id" VARCHAR(15) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx09_km_article_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_km_feedback" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_km_feedback_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "article_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "is_helpful" BOOLEAN NOT NULL DEFAULT true,
    "comment" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nx09_km_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_km_tag" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_km_tag_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx09_km_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_meeting" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_meeting_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "meeting_type" VARCHAR(2) NOT NULL,
    "location" VARCHAR(200),
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "organizer_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx09_meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_meeting_action" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_meeting_action_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "meeting_id" VARCHAR(15) NOT NULL,
    "minutes_id" VARCHAR(15),
    "title" VARCHAR(200) NOT NULL,
    "assignee_id" VARCHAR(15) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'O',
    "completed_at" TIMESTAMP(3),
    "result_desc" TEXT,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx09_meeting_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_meeting_attendee" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_meeting_attendee_id(),
    "meeting_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "confirm_status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "actual_attended" BOOLEAN NOT NULL DEFAULT false,
    "absent_reason" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx09_meeting_attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx09_meeting_minutes" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_meeting_minutes_id(),
    "meeting_id" VARCHAR(15) NOT NULL,
    "content" TEXT,
    "decisions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx09_meeting_minutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_emp_exp_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_emp_exp_log_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "source_type" VARCHAR(2) NOT NULL,
    "exp_change" INTEGER NOT NULL DEFAULT 0,
    "exp_after" INTEGER NOT NULL DEFAULT 0,
    "source_ref_id" VARCHAR(15),
    "reason" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx10_emp_exp_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_emp_medal" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_emp_medal_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "medal_level_id" VARCHAR(15) NOT NULL,
    "total_exp" INTEGER NOT NULL DEFAULT 0,
    "current_level_exp" INTEGER NOT NULL DEFAULT 0,
    "demotion_protect_until" DATE,
    "last_checkin_date" DATE,
    "consecutive_checkin" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nx10_emp_medal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_emp_task_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_emp_task_log_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "task_template_id" VARCHAR(15) NOT NULL,
    "period_value" VARCHAR(10) NOT NULL,
    "achieve_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "exp_earned" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nx10_emp_task_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_medal_level" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_medal_level_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "level_code" VARCHAR(10) NOT NULL,
    "level_name" VARCHAR(20) NOT NULL,
    "tier" VARCHAR(10) NOT NULL,
    "rank" INTEGER NOT NULL,
    "sort_no" INTEGER NOT NULL,
    "exp_threshold" INTEGER NOT NULL DEFAULT 0,
    "icon_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx10_medal_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_mentorship_record" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_mentorship_record_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "mentor_id" VARCHAR(15) NOT NULL,
    "mentee_id" VARCHAR(15) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "mentee_kpi_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "reward_exp" INTEGER NOT NULL DEFAULT 500,
    "reward_issued" BOOLEAN NOT NULL DEFAULT false,
    "issued_at" TIMESTAMP(3),
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx10_mentorship_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_promotion_criteria" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_promotion_criteria_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "from_role_id" VARCHAR(15) NOT NULL,
    "to_role_id" VARCHAR(15) NOT NULL,
    "min_medal_level_id" VARCHAR(15) NOT NULL,
    "min_tenure_months" INTEGER NOT NULL DEFAULT 0,
    "min_kpi_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "min_mentorship_count" INTEGER NOT NULL DEFAULT 0,
    "no_penalty_days" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx10_promotion_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_promotion_request" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_promotion_request_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "criteria_id" VARCHAR(15) NOT NULL,
    "apply_date" DATE NOT NULL,
    "sys_verify_result" VARCHAR(1) NOT NULL DEFAULT 'P',
    "sys_verify_detail" TEXT,
    "supervisor_recommend" TEXT,
    "reviewed_by" VARCHAR(15),
    "reviewed_at" TIMESTAMP(3),
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "reject_reason" VARCHAR(500),
    "executed_at" TIMESTAMP(3),
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx10_promotion_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_sprint_task" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_sprint_task_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sprint_type" VARCHAR(2) NOT NULL DEFAULT 'WS',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "exp_multiplier" DECIMAL(4,2) NOT NULL,
    "target_desc" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx10_sprint_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_sprint_task_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_sprint_task_log_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "sprint_task_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "base_exp" INTEGER NOT NULL DEFAULT 0,
    "bonus_exp" INTEGER NOT NULL DEFAULT 0,
    "total_exp" INTEGER NOT NULL DEFAULT 0,
    "rank_no" INTEGER,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nx10_sprint_task_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_surprise_box_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_surprise_box_log_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "box_type" VARCHAR(1) NOT NULL DEFAULT 'N',
    "trigger_type" VARCHAR(2) NOT NULL DEFAULT 'LU',
    "exp_earned" INTEGER NOT NULL DEFAULT 0,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daily_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "nx10_surprise_box_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_task_template" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_task_template_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "task_cycle" VARCHAR(1) NOT NULL DEFAULT 'D',
    "applicable_roles" VARCHAR(200),
    "exp_base" INTEGER NOT NULL DEFAULT 0,
    "exp_formula" VARCHAR(500),
    "source_module" VARCHAR(10),
    "source_kpi_code" VARCHAR(20),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx10_task_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_team_task" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_team_task_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(2) NOT NULL DEFAULT 'AT',
    "target_value" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "task_cycle" VARCHAR(1) NOT NULL DEFAULT 'W',
    "reward_exp" INTEGER NOT NULL DEFAULT 0,
    "warehouse_id" VARCHAR(15),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx10_team_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx10_team_task_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_team_task_log_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "team_task_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "period_value" VARCHAR(10) NOT NULL,
    "actual_value" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_achieved" BOOLEAN NOT NULL DEFAULT false,
    "reward_issued" BOOLEAN NOT NULL DEFAULT false,
    "issued_at" TIMESTAMP(3),
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nx10_team_task_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx98_doc_link" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx98_doc_link_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "from_doc_type" VARCHAR(4) NOT NULL,
    "from_doc_id" VARCHAR(15) NOT NULL,
    "to_doc_type" VARCHAR(4) NOT NULL,
    "to_doc_id" VARCHAR(15) NOT NULL,
    "link_type" VARCHAR(2) NOT NULL DEFAULT 'CV',
    "linked_qty" DECIMAL(14,4),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx98_doc_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_plan" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_plan_id(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "level_no" INTEGER NOT NULL DEFAULT 10,
    "base_fee_month" INTEGER NOT NULL DEFAULT 0,
    "seat_fee_month" INTEGER NOT NULL DEFAULT 0,
    "min_seats" INTEGER NOT NULL DEFAULT 1,
    "max_seats" INTEGER NOT NULL DEFAULT 1,
    "billing_default" VARCHAR(10) NOT NULL DEFAULT 'MONTH',
    "tier" VARCHAR(4) NOT NULL DEFAULT 'S',
    "quarter_discount_type" VARCHAR(1) NOT NULL DEFAULT 'R',
    "quarter_discount_value" INTEGER NOT NULL DEFAULT 7,
    "year_discount_type" VARCHAR(1) NOT NULL DEFAULT 'R',
    "year_discount_value" INTEGER NOT NULL DEFAULT 0,
    "year_price_override" INTEGER,
    "remark" VARCHAR(200),
    "sort_no" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx99_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_product_module" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_product_module_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "module_level" VARCHAR(1) NOT NULL,
    "applicable_plan_code" VARCHAR(30) NOT NULL,
    "billing_type" VARCHAR(1) NOT NULL DEFAULT 'F',
    "monthly_fee" INTEGER NOT NULL DEFAULT 0,
    "is_bundle_default" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx99_product_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_product_module_map" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_product_module_map_id(),
    "product_module_id" VARCHAR(15) NOT NULL,
    "app_module_code" VARCHAR(10) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx99_product_module_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_release" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_release_id(),
    "version" VARCHAR(20) NOT NULL,
    "release_date" DATE NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx99_release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_release_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_release_item_id(),
    "release_id" VARCHAR(15) NOT NULL,
    "item_type" VARCHAR(1) NOT NULL,
    "module_code" VARCHAR(10) NOT NULL,
    "item_name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx99_release_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_subscription" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_subscription_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "plan_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'A',
    "billing_cycle" VARCHAR(1) NOT NULL DEFAULT 'M',
    "seats" INTEGER NOT NULL DEFAULT 1,
    "start_at" TEXT NOT NULL,
    "end_at" TEXT NOT NULL,
    "auto_renew" BOOLEAN NOT NULL,
    "base_fee_snapshot" INTEGER NOT NULL,
    "seat_fee_snapshot" INTEGER NOT NULL,
    "discount_type_snapshot" VARCHAR(1) NOT NULL,
    "discount_value_snapshot" INTEGER NOT NULL,
    "subtotal_snapshot" INTEGER NOT NULL,
    "discount_amount_snapshot" INTEGER NOT NULL,
    "total_snapshot" INTEGER NOT NULL,
    "currency_id" VARCHAR(10) NOT NULL,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx99_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_subscription_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_subscription_item_id(),
    "subscription_id" VARCHAR(15) NOT NULL,
    "item_type" VARCHAR(20) NOT NULL DEFAULT 'M',
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
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx99_subscription_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_tenant" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_tenant_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100),
    "status" VARCHAR(1) NOT NULL,
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    "contact_name" VARCHAR(50),
    "contact_email" VARCHAR(100),
    "contact_phone" VARCHAR(30),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Taipei',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'zh-TW',

    CONSTRAINT "nx99_tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx01_car_brand_code_key" ON "nx01_car_brand"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_country_code_key" ON "nx01_country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_currency_code_key" ON "nx01_currency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_part_brand_code_key" ON "nx01_part_brand"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_part_group_code_key" ON "nx01_part_group"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_partner_code_key" ON "nx01_partner"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_role_code_key" ON "nx01_role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_user_tenant_id_user_account_key" ON "nx01_user"("tenant_id", "user_account");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_user_user_account_key" ON "nx01_user"("user_account");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_view_code_key" ON "nx01_view"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_warehouse_code_key" ON "nx01_warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_warehouse_type_code_key" ON "nx01_warehouse_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx02_demand_doc_no_key" ON "nx02_demand"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx02_po_doc_no_key" ON "nx02_po"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx02_pr_doc_no_key" ON "nx02_pr"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx02_rfq_doc_no_key" ON "nx02_rfq"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx02_rr_doc_no_key" ON "nx02_rr"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx02_ti_doc_no_key" ON "nx02_ti"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx03_init_doc_no_key" ON "nx03_init"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx03_parcel_parcel_no_key" ON "nx03_parcel"("parcel_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx03_pk_doc_no_key" ON "nx03_pk"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx03_pl_doc_no_key" ON "nx03_pl"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx03_stock_balance_tenant_id_part_id_warehouse_id_key" ON "nx03_stock_balance"("tenant_id", "part_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx03_stock_take_doc_no_key" ON "nx03_stock_take"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx04_quote_doc_no_key" ON "nx04_quote"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx04_so_doc_no_key" ON "nx04_so"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx04_sr_doc_no_key" ON "nx04_sr"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_account_code_code_key" ON "nx05_account_code"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_allowance_doc_no_key" ON "nx05_allowance"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_ap_ledger_doc_no_key" ON "nx05_ap_ledger"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_ar_ledger_doc_no_key" ON "nx05_ar_ledger"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_note_doc_no_key" ON "nx05_note"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_paylog_doc_no_key" ON "nx05_paylog"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx06_dn_doc_no_key" ON "nx06_dn"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx08_daily_report_report_date_key" ON "nx08_daily_report"("report_date");

-- CreateIndex
CREATE UNIQUE INDEX "nx08_monthly_report_year_month_key" ON "nx08_monthly_report"("year_month");

-- CreateIndex
CREATE UNIQUE INDEX "nx09_meeting_minutes_meeting_id_key" ON "nx09_meeting_minutes"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx10_emp_medal_user_id_key" ON "nx10_emp_medal"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx10_medal_level_level_code_key" ON "nx10_medal_level"("level_code");

-- CreateIndex
CREATE UNIQUE INDEX "nx10_task_template_code_key" ON "nx10_task_template"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_plan_code_key" ON "nx99_plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_product_module_code_key" ON "nx99_product_module"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_release_version_key" ON "nx99_release"("version");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_tenant_code_key" ON "nx99_tenant"("code");

-- AddForeignKey
ALTER TABLE "nx01_audit_log" ADD CONSTRAINT "nx01_audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_brand_code_rule" ADD CONSTRAINT "nx01_brand_code_rule_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_brand_code_rule" ADD CONSTRAINT "nx01_brand_code_rule_part_brand_id_fkey" FOREIGN KEY ("part_brand_id") REFERENCES "nx01_part_brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_bulletin" ADD CONSTRAINT "nx01_bulletin_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_calendar_event" ADD CONSTRAINT "nx01_calendar_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_car_brand" ADD CONSTRAINT "nx01_car_brand_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_car_brand" ADD CONSTRAINT "nx01_car_brand_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "nx01_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_customer_grade" ADD CONSTRAINT "nx01_customer_grade_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_department" ADD CONSTRAINT "nx01_department_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_discount_code" ADD CONSTRAINT "nx01_discount_code_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_kpi_record" ADD CONSTRAINT "nx01_kpi_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_kpi_record" ADD CONSTRAINT "nx01_kpi_record_kpi_template_id_fkey" FOREIGN KEY ("kpi_template_id") REFERENCES "nx01_kpi_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_kpi_record" ADD CONSTRAINT "nx01_kpi_record_kpi_target_id_fkey" FOREIGN KEY ("kpi_target_id") REFERENCES "nx01_kpi_target"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_kpi_record" ADD CONSTRAINT "nx01_kpi_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_kpi_target" ADD CONSTRAINT "nx01_kpi_target_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_kpi_target" ADD CONSTRAINT "nx01_kpi_target_kpi_template_id_fkey" FOREIGN KEY ("kpi_template_id") REFERENCES "nx01_kpi_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_kpi_target" ADD CONSTRAINT "nx01_kpi_target_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx01_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_kpi_target" ADD CONSTRAINT "nx01_kpi_target_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_kpi_template" ADD CONSTRAINT "nx01_kpi_template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_location" ADD CONSTRAINT "nx01_location_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_location" ADD CONSTRAINT "nx01_location_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part" ADD CONSTRAINT "nx01_part_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part" ADD CONSTRAINT "nx01_part_code_rule_id_fkey" FOREIGN KEY ("code_rule_id") REFERENCES "nx01_brand_code_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part" ADD CONSTRAINT "nx01_part_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "nx01_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part" ADD CONSTRAINT "nx01_part_part_brand_id_fkey" FOREIGN KEY ("part_brand_id") REFERENCES "nx01_part_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part" ADD CONSTRAINT "nx01_part_part_group_id_fkey" FOREIGN KEY ("part_group_id") REFERENCES "nx01_part_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part_brand" ADD CONSTRAINT "nx01_part_brand_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part_brand" ADD CONSTRAINT "nx01_part_brand_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "nx01_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part_group" ADD CONSTRAINT "nx01_part_group_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part_relation" ADD CONSTRAINT "nx01_part_relation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part_relation" ADD CONSTRAINT "nx01_part_relation_part_id_from_fkey" FOREIGN KEY ("part_id_from") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_part_relation" ADD CONSTRAINT "nx01_part_relation_part_id_to_fkey" FOREIGN KEY ("part_id_to") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner" ADD CONSTRAINT "nx01_partner_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner" ADD CONSTRAINT "nx01_partner_customer_grade_id_fkey" FOREIGN KEY ("customer_grade_id") REFERENCES "nx01_customer_grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_role" ADD CONSTRAINT "nx01_role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_role_view" ADD CONSTRAINT "nx01_role_view_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_role_view" ADD CONSTRAINT "nx01_role_view_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx01_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_role_view" ADD CONSTRAINT "nx01_role_view_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "nx01_view"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_team" ADD CONSTRAINT "nx01_team_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_team" ADD CONSTRAINT "nx01_team_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "nx01_department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_team" ADD CONSTRAINT "nx01_team_parent_team_id_fkey" FOREIGN KEY ("parent_team_id") REFERENCES "nx01_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_team" ADD CONSTRAINT "nx01_team_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user" ADD CONSTRAINT "nx01_user_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user" ADD CONSTRAINT "nx01_user_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user" ADD CONSTRAINT "nx01_user_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_role" ADD CONSTRAINT "nx01_user_role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_role" ADD CONSTRAINT "nx01_user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_role" ADD CONSTRAINT "nx01_user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx01_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_team" ADD CONSTRAINT "nx01_user_team_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_team" ADD CONSTRAINT "nx01_user_team_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_team" ADD CONSTRAINT "nx01_user_team_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "nx01_team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_warehouse" ADD CONSTRAINT "nx01_user_warehouse_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_warehouse" ADD CONSTRAINT "nx01_user_warehouse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_warehouse" ADD CONSTRAINT "nx01_user_warehouse_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_warehouse" ADD CONSTRAINT "nx01_warehouse_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_warehouse" ADD CONSTRAINT "nx01_warehouse_warehouse_type_id_fkey" FOREIGN KEY ("warehouse_type_id") REFERENCES "nx01_warehouse_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_demand" ADD CONSTRAINT "nx02_demand_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_demand" ADD CONSTRAINT "nx02_demand_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_demand" ADD CONSTRAINT "nx02_demand_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_demand" ADD CONSTRAINT "nx02_demand_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "nx01_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_demand" ADD CONSTRAINT "nx02_demand_ref_rfq_id_fkey" FOREIGN KEY ("ref_rfq_id") REFERENCES "nx02_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_po" ADD CONSTRAINT "nx02_po_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_po" ADD CONSTRAINT "nx02_po_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_po" ADD CONSTRAINT "nx02_po_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "nx02_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_po_item" ADD CONSTRAINT "nx02_po_item_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "nx02_po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_po_item" ADD CONSTRAINT "nx02_po_item_rfq_item_id_fkey" FOREIGN KEY ("rfq_item_id") REFERENCES "nx02_rfq_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_po_item" ADD CONSTRAINT "nx02_po_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_pr" ADD CONSTRAINT "nx02_pr_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_pr" ADD CONSTRAINT "nx02_pr_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_pr" ADD CONSTRAINT "nx02_pr_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_pr" ADD CONSTRAINT "nx02_pr_rr_id_fkey" FOREIGN KEY ("rr_id") REFERENCES "nx02_rr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_pr_item" ADD CONSTRAINT "nx02_pr_item_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "nx02_pr"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_pr_item" ADD CONSTRAINT "nx02_pr_item_rr_item_id_fkey" FOREIGN KEY ("rr_item_id") REFERENCES "nx02_rr_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_pr_item" ADD CONSTRAINT "nx02_pr_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_pr_item" ADD CONSTRAINT "nx02_pr_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rfq" ADD CONSTRAINT "nx02_rfq_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rfq" ADD CONSTRAINT "nx02_rfq_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "nx01_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rfq" ADD CONSTRAINT "nx02_rfq_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rfq" ADD CONSTRAINT "nx02_rfq_demand_id_fkey" FOREIGN KEY ("demand_id") REFERENCES "nx02_demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rfq_item" ADD CONSTRAINT "nx02_rfq_item_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "nx02_rfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rfq_item" ADD CONSTRAINT "nx02_rfq_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rfq_item" ADD CONSTRAINT "nx02_rfq_item_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rfq_item" ADD CONSTRAINT "nx02_rfq_item_demand_item_id_fkey" FOREIGN KEY ("demand_item_id") REFERENCES "nx02_demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr" ADD CONSTRAINT "nx02_rr_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr" ADD CONSTRAINT "nx02_rr_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr" ADD CONSTRAINT "nx02_rr_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr" ADD CONSTRAINT "nx02_rr_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "nx02_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr" ADD CONSTRAINT "nx02_rr_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "nx02_po"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr" ADD CONSTRAINT "nx02_rr_ti_id_fkey" FOREIGN KEY ("ti_id") REFERENCES "nx02_ti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr_import" ADD CONSTRAINT "nx02_rr_import_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr_import" ADD CONSTRAINT "nx02_rr_import_rr_id_fkey" FOREIGN KEY ("rr_id") REFERENCES "nx02_rr"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr_import" ADD CONSTRAINT "nx02_rr_import_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "nx02_po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr_import" ADD CONSTRAINT "nx02_rr_import_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr_item" ADD CONSTRAINT "nx02_rr_item_rr_id_fkey" FOREIGN KEY ("rr_id") REFERENCES "nx02_rr"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr_item" ADD CONSTRAINT "nx02_rr_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_rr_item" ADD CONSTRAINT "nx02_rr_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti" ADD CONSTRAINT "nx02_ti_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti" ADD CONSTRAINT "nx02_ti_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti" ADD CONSTRAINT "nx02_ti_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti" ADD CONSTRAINT "nx02_ti_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "nx02_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti" ADD CONSTRAINT "nx02_ti_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti_item" ADD CONSTRAINT "nx02_ti_item_ti_id_fkey" FOREIGN KEY ("ti_id") REFERENCES "nx02_ti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti_item" ADD CONSTRAINT "nx02_ti_item_rfq_item_id_fkey" FOREIGN KEY ("rfq_item_id") REFERENCES "nx02_rfq_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti_item" ADD CONSTRAINT "nx02_ti_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti_item" ADD CONSTRAINT "nx02_ti_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_auto_replenish" ADD CONSTRAINT "nx03_auto_replenish_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_auto_replenish" ADD CONSTRAINT "nx03_auto_replenish_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_auto_replenish" ADD CONSTRAINT "nx03_auto_replenish_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_init" ADD CONSTRAINT "nx03_init_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_init" ADD CONSTRAINT "nx03_init_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_init_item" ADD CONSTRAINT "nx03_init_item_init_id_fkey" FOREIGN KEY ("init_id") REFERENCES "nx03_init"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_init_item" ADD CONSTRAINT "nx03_init_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_init_item" ADD CONSTRAINT "nx03_init_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_parcel" ADD CONSTRAINT "nx03_parcel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_parcel" ADD CONSTRAINT "nx03_parcel_pl_id_fkey" FOREIGN KEY ("pl_id") REFERENCES "nx03_pl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_parcel" ADD CONSTRAINT "nx03_parcel_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_parcel" ADD CONSTRAINT "nx03_parcel_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_parcel" ADD CONSTRAINT "nx03_parcel_to_partner_id_fkey" FOREIGN KEY ("to_partner_id") REFERENCES "nx01_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_part_stock_setting" ADD CONSTRAINT "nx03_part_stock_setting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_part_stock_setting" ADD CONSTRAINT "nx03_part_stock_setting_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_part_stock_setting" ADD CONSTRAINT "nx03_part_stock_setting_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pk" ADD CONSTRAINT "nx03_pk_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pk" ADD CONSTRAINT "nx03_pk_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pk_item" ADD CONSTRAINT "nx03_pk_item_pk_id_fkey" FOREIGN KEY ("pk_id") REFERENCES "nx03_pk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pk_item" ADD CONSTRAINT "nx03_pk_item_ref_so_id_fkey" FOREIGN KEY ("ref_so_id") REFERENCES "nx04_so"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pk_item" ADD CONSTRAINT "nx03_pk_item_ref_so_item_id_fkey" FOREIGN KEY ("ref_so_item_id") REFERENCES "nx04_so_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pk_item" ADD CONSTRAINT "nx03_pk_item_ref_st_id_fkey" FOREIGN KEY ("ref_st_id") REFERENCES "nx03_st"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pk_item" ADD CONSTRAINT "nx03_pk_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pk_item" ADD CONSTRAINT "nx03_pk_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pl" ADD CONSTRAINT "nx03_pl_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pl" ADD CONSTRAINT "nx03_pl_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pl" ADD CONSTRAINT "nx03_pl_pk_id_fkey" FOREIGN KEY ("pk_id") REFERENCES "nx03_pk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pl_item" ADD CONSTRAINT "nx03_pl_item_pl_id_fkey" FOREIGN KEY ("pl_id") REFERENCES "nx03_pl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pl_item" ADD CONSTRAINT "nx03_pl_item_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "nx03_parcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pl_item" ADD CONSTRAINT "nx03_pl_item_pk_item_id_fkey" FOREIGN KEY ("pk_item_id") REFERENCES "nx03_pk_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_pl_item" ADD CONSTRAINT "nx03_pl_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_shortage" ADD CONSTRAINT "nx03_shortage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_shortage" ADD CONSTRAINT "nx03_shortage_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_shortage" ADD CONSTRAINT "nx03_shortage_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_shortage" ADD CONSTRAINT "nx03_shortage_ref_rfq_id_fkey" FOREIGN KEY ("ref_rfq_id") REFERENCES "nx02_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st" ADD CONSTRAINT "nx03_st_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st" ADD CONSTRAINT "nx03_st_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st" ADD CONSTRAINT "nx03_st_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st" ADD CONSTRAINT "nx03_st_ref_so_id_fkey" FOREIGN KEY ("ref_so_id") REFERENCES "nx04_so"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st" ADD CONSTRAINT "nx03_st_ref_rr_id_fkey" FOREIGN KEY ("ref_rr_id") REFERENCES "nx02_rr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st_item" ADD CONSTRAINT "nx03_st_item_st_id_fkey" FOREIGN KEY ("st_id") REFERENCES "nx03_st"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st_item" ADD CONSTRAINT "nx03_st_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st_item" ADD CONSTRAINT "nx03_st_item_part_brand_id_fkey" FOREIGN KEY ("part_brand_id") REFERENCES "nx01_part_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st_item" ADD CONSTRAINT "nx03_st_item_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st_item" ADD CONSTRAINT "nx03_st_item_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_balance" ADD CONSTRAINT "nx03_stock_balance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_balance" ADD CONSTRAINT "nx03_stock_balance_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_balance" ADD CONSTRAINT "nx03_stock_balance_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_ledger" ADD CONSTRAINT "nx03_stock_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_ledger" ADD CONSTRAINT "nx03_stock_ledger_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_ledger" ADD CONSTRAINT "nx03_stock_ledger_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_ledger" ADD CONSTRAINT "nx03_stock_ledger_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_take" ADD CONSTRAINT "nx03_stock_take_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_take" ADD CONSTRAINT "nx03_stock_take_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_take_item" ADD CONSTRAINT "nx03_stock_take_item_stock_take_id_fkey" FOREIGN KEY ("stock_take_id") REFERENCES "nx03_stock_take"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_take_item" ADD CONSTRAINT "nx03_stock_take_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_take_item" ADD CONSTRAINT "nx03_stock_take_item_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_stock_take_item" ADD CONSTRAINT "nx03_stock_take_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_quote" ADD CONSTRAINT "nx04_quote_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_quote" ADD CONSTRAINT "nx04_quote_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_quote" ADD CONSTRAINT "nx04_quote_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_quote" ADD CONSTRAINT "nx04_quote_customer_grade_id_fkey" FOREIGN KEY ("customer_grade_id") REFERENCES "nx01_customer_grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_quote" ADD CONSTRAINT "nx04_quote_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_quote" ADD CONSTRAINT "nx04_quote_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "nx02_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_quote_item" ADD CONSTRAINT "nx04_quote_item_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "nx04_quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_quote_item" ADD CONSTRAINT "nx04_quote_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_quote_item" ADD CONSTRAINT "nx04_quote_item_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "nx01_discount_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so" ADD CONSTRAINT "nx04_so_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so" ADD CONSTRAINT "nx04_so_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so" ADD CONSTRAINT "nx04_so_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so" ADD CONSTRAINT "nx04_so_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "nx04_quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so" ADD CONSTRAINT "nx04_so_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so_item" ADD CONSTRAINT "nx04_so_item_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "nx04_so"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so_item" ADD CONSTRAINT "nx04_so_item_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "nx04_quote_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so_item" ADD CONSTRAINT "nx04_so_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so_item" ADD CONSTRAINT "nx04_so_item_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so_item" ADD CONSTRAINT "nx04_so_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so_item" ADD CONSTRAINT "nx04_so_item_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "nx01_discount_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so_item" ADD CONSTRAINT "nx04_so_item_ti_id_fkey" FOREIGN KEY ("ti_id") REFERENCES "nx02_ti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_so_item" ADD CONSTRAINT "nx04_so_item_st_id_fkey" FOREIGN KEY ("st_id") REFERENCES "nx03_st"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_sr" ADD CONSTRAINT "nx04_sr_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_sr" ADD CONSTRAINT "nx04_sr_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_sr" ADD CONSTRAINT "nx04_sr_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_sr" ADD CONSTRAINT "nx04_sr_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "nx04_so"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_sr_item" ADD CONSTRAINT "nx04_sr_item_sr_id_fkey" FOREIGN KEY ("sr_id") REFERENCES "nx04_sr"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_sr_item" ADD CONSTRAINT "nx04_sr_item_so_item_id_fkey" FOREIGN KEY ("so_item_id") REFERENCES "nx04_so_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_sr_item" ADD CONSTRAINT "nx04_sr_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx04_sr_item" ADD CONSTRAINT "nx04_sr_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_account_code" ADD CONSTRAINT "nx05_account_code_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_allowance" ADD CONSTRAINT "nx05_allowance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_allowance" ADD CONSTRAINT "nx05_allowance_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_allowance" ADD CONSTRAINT "nx05_allowance_ref_ar_id_fkey" FOREIGN KEY ("ref_ar_id") REFERENCES "nx05_ar_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_allowance" ADD CONSTRAINT "nx05_allowance_ref_ap_id_fkey" FOREIGN KEY ("ref_ap_id") REFERENCES "nx05_ap_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_allowance_item" ADD CONSTRAINT "nx05_allowance_item_allowance_id_fkey" FOREIGN KEY ("allowance_id") REFERENCES "nx05_allowance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ap_ledger" ADD CONSTRAINT "nx05_ap_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ap_ledger" ADD CONSTRAINT "nx05_ap_ledger_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "nx02_po"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ap_ledger" ADD CONSTRAINT "nx05_ap_ledger_rr_id_fkey" FOREIGN KEY ("rr_id") REFERENCES "nx02_rr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ap_ledger" ADD CONSTRAINT "nx05_ap_ledger_ti_id_fkey" FOREIGN KEY ("ti_id") REFERENCES "nx02_ti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ap_ledger" ADD CONSTRAINT "nx05_ap_ledger_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ap_ledger" ADD CONSTRAINT "nx05_ap_ledger_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ar_ledger" ADD CONSTRAINT "nx05_ar_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ar_ledger" ADD CONSTRAINT "nx05_ar_ledger_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "nx04_so"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ar_ledger" ADD CONSTRAINT "nx05_ar_ledger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ar_ledger" ADD CONSTRAINT "nx05_ar_ledger_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_closing" ADD CONSTRAINT "nx05_closing_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note" ADD CONSTRAINT "nx05_note_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note" ADD CONSTRAINT "nx05_note_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note" ADD CONSTRAINT "nx05_note_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note" ADD CONSTRAINT "nx05_note_paylog_id_fkey" FOREIGN KEY ("paylog_id") REFERENCES "nx05_paylog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog" ADD CONSTRAINT "nx05_paylog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog" ADD CONSTRAINT "nx05_paylog_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog" ADD CONSTRAINT "nx05_paylog_ar_id_fkey" FOREIGN KEY ("ar_id") REFERENCES "nx05_ar_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog" ADD CONSTRAINT "nx05_paylog_ap_id_fkey" FOREIGN KEY ("ap_id") REFERENCES "nx05_ap_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog" ADD CONSTRAINT "nx05_paylog_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog" ADD CONSTRAINT "nx05_paylog_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "nx05_note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog" ADD CONSTRAINT "nx05_paylog_account_code_id_fkey" FOREIGN KEY ("account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn" ADD CONSTRAINT "nx06_dn_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn" ADD CONSTRAINT "nx06_dn_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn" ADD CONSTRAINT "nx06_dn_driver_user_id_fkey" FOREIGN KEY ("driver_user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_item" ADD CONSTRAINT "nx06_dn_item_dn_id_fkey" FOREIGN KEY ("dn_id") REFERENCES "nx06_dn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_item" ADD CONSTRAINT "nx06_dn_item_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "nx06_dn_stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_item" ADD CONSTRAINT "nx06_dn_item_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "nx03_parcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_item" ADD CONSTRAINT "nx06_dn_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_stop" ADD CONSTRAINT "nx06_dn_stop_dn_id_fkey" FOREIGN KEY ("dn_id") REFERENCES "nx06_dn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_stop" ADD CONSTRAINT "nx06_dn_stop_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx06_dn_stop" ADD CONSTRAINT "nx06_dn_stop_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_attendance" ADD CONSTRAINT "nx07_attendance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_attendance" ADD CONSTRAINT "nx07_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_attendance" ADD CONSTRAINT "nx07_attendance_schedule_item_id_fkey" FOREIGN KEY ("schedule_item_id") REFERENCES "nx07_schedule_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_ip_whitelist" ADD CONSTRAINT "nx07_ip_whitelist_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_ip_whitelist" ADD CONSTRAINT "nx07_ip_whitelist_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_leave_balance" ADD CONSTRAINT "nx07_leave_balance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_leave_balance" ADD CONSTRAINT "nx07_leave_balance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_leave_balance" ADD CONSTRAINT "nx07_leave_balance_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "nx07_leave_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_leave_request" ADD CONSTRAINT "nx07_leave_request_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_leave_request" ADD CONSTRAINT "nx07_leave_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_leave_request" ADD CONSTRAINT "nx07_leave_request_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "nx07_leave_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_leave_type" ADD CONSTRAINT "nx07_leave_type_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_overtime_request" ADD CONSTRAINT "nx07_overtime_request_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_overtime_request" ADD CONSTRAINT "nx07_overtime_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_salary_component" ADD CONSTRAINT "nx07_salary_component_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_salary_component" ADD CONSTRAINT "nx07_salary_component_kpi_template_id_fkey" FOREIGN KEY ("kpi_template_id") REFERENCES "nx01_kpi_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_salary_record" ADD CONSTRAINT "nx07_salary_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_salary_record" ADD CONSTRAINT "nx07_salary_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_salary_record_item" ADD CONSTRAINT "nx07_salary_record_item_salary_record_id_fkey" FOREIGN KEY ("salary_record_id") REFERENCES "nx07_salary_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_salary_record_item" ADD CONSTRAINT "nx07_salary_record_item_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "nx07_salary_component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_salary_setting" ADD CONSTRAINT "nx07_salary_setting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_salary_setting" ADD CONSTRAINT "nx07_salary_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_schedule" ADD CONSTRAINT "nx07_schedule_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_schedule" ADD CONSTRAINT "nx07_schedule_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "nx01_team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_schedule_item" ADD CONSTRAINT "nx07_schedule_item_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "nx07_schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_schedule_item" ADD CONSTRAINT "nx07_schedule_item_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_schedule_item" ADD CONSTRAINT "nx07_schedule_item_shift_type_id_fkey" FOREIGN KEY ("shift_type_id") REFERENCES "nx07_shift_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_schedule_item" ADD CONSTRAINT "nx07_schedule_item_swap_user_id_fkey" FOREIGN KEY ("swap_user_id") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_shift_type" ADD CONSTRAINT "nx07_shift_type_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_daily_report" ADD CONSTRAINT "nx08_daily_report_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_daily_report" ADD CONSTRAINT "nx08_daily_report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_finance_cache" ADD CONSTRAINT "nx08_finance_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_hr_cache" ADD CONSTRAINT "nx08_hr_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_hr_cache" ADD CONSTRAINT "nx08_hr_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_inventory_cache" ADD CONSTRAINT "nx08_inventory_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_inventory_cache" ADD CONSTRAINT "nx08_inventory_cache_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_inventory_cache" ADD CONSTRAINT "nx08_inventory_cache_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_monthly_report" ADD CONSTRAINT "nx08_monthly_report_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_monthly_report" ADD CONSTRAINT "nx08_monthly_report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_pestel_record" ADD CONSTRAINT "nx08_pestel_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_purchase_cache" ADD CONSTRAINT "nx08_purchase_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_purchase_cache" ADD CONSTRAINT "nx08_purchase_cache_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_cache" ADD CONSTRAINT "nx08_sales_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_sales_cache" ADD CONSTRAINT "nx08_sales_cache_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_swot_record" ADD CONSTRAINT "nx08_swot_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_document" ADD CONSTRAINT "nx09_document_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_document" ADD CONSTRAINT "nx09_document_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "nx01_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_document_version" ADD CONSTRAINT "nx09_document_version_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "nx09_document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_km_article" ADD CONSTRAINT "nx09_km_article_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_km_article" ADD CONSTRAINT "nx09_km_article_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "nx01_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_km_article_tag" ADD CONSTRAINT "nx09_km_article_tag_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "nx09_km_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_km_article_tag" ADD CONSTRAINT "nx09_km_article_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "nx09_km_tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_km_feedback" ADD CONSTRAINT "nx09_km_feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_km_feedback" ADD CONSTRAINT "nx09_km_feedback_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "nx09_km_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_km_feedback" ADD CONSTRAINT "nx09_km_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_km_tag" ADD CONSTRAINT "nx09_km_tag_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_meeting" ADD CONSTRAINT "nx09_meeting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_meeting" ADD CONSTRAINT "nx09_meeting_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_meeting_action" ADD CONSTRAINT "nx09_meeting_action_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_meeting_action" ADD CONSTRAINT "nx09_meeting_action_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "nx09_meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_meeting_action" ADD CONSTRAINT "nx09_meeting_action_minutes_id_fkey" FOREIGN KEY ("minutes_id") REFERENCES "nx09_meeting_minutes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_meeting_action" ADD CONSTRAINT "nx09_meeting_action_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_meeting_attendee" ADD CONSTRAINT "nx09_meeting_attendee_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "nx09_meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_meeting_attendee" ADD CONSTRAINT "nx09_meeting_attendee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_meeting_minutes" ADD CONSTRAINT "nx09_meeting_minutes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "nx09_meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_emp_exp_log" ADD CONSTRAINT "nx10_emp_exp_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_emp_exp_log" ADD CONSTRAINT "nx10_emp_exp_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_emp_medal" ADD CONSTRAINT "nx10_emp_medal_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_emp_medal" ADD CONSTRAINT "nx10_emp_medal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_emp_medal" ADD CONSTRAINT "nx10_emp_medal_medal_level_id_fkey" FOREIGN KEY ("medal_level_id") REFERENCES "nx10_medal_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_emp_task_log" ADD CONSTRAINT "nx10_emp_task_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_emp_task_log" ADD CONSTRAINT "nx10_emp_task_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_emp_task_log" ADD CONSTRAINT "nx10_emp_task_log_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "nx10_task_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_medal_level" ADD CONSTRAINT "nx10_medal_level_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_mentorship_record" ADD CONSTRAINT "nx10_mentorship_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_mentorship_record" ADD CONSTRAINT "nx10_mentorship_record_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_mentorship_record" ADD CONSTRAINT "nx10_mentorship_record_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_promotion_criteria" ADD CONSTRAINT "nx10_promotion_criteria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_promotion_criteria" ADD CONSTRAINT "nx10_promotion_criteria_from_role_id_fkey" FOREIGN KEY ("from_role_id") REFERENCES "nx01_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_promotion_criteria" ADD CONSTRAINT "nx10_promotion_criteria_to_role_id_fkey" FOREIGN KEY ("to_role_id") REFERENCES "nx01_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_promotion_criteria" ADD CONSTRAINT "nx10_promotion_criteria_min_medal_level_id_fkey" FOREIGN KEY ("min_medal_level_id") REFERENCES "nx10_medal_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_promotion_request" ADD CONSTRAINT "nx10_promotion_request_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_promotion_request" ADD CONSTRAINT "nx10_promotion_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_promotion_request" ADD CONSTRAINT "nx10_promotion_request_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "nx10_promotion_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_sprint_task" ADD CONSTRAINT "nx10_sprint_task_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_sprint_task_log" ADD CONSTRAINT "nx10_sprint_task_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_sprint_task_log" ADD CONSTRAINT "nx10_sprint_task_log_sprint_task_id_fkey" FOREIGN KEY ("sprint_task_id") REFERENCES "nx10_sprint_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_sprint_task_log" ADD CONSTRAINT "nx10_sprint_task_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_surprise_box_log" ADD CONSTRAINT "nx10_surprise_box_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_surprise_box_log" ADD CONSTRAINT "nx10_surprise_box_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_task_template" ADD CONSTRAINT "nx10_task_template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_team_task" ADD CONSTRAINT "nx10_team_task_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_team_task" ADD CONSTRAINT "nx10_team_task_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_team_task_log" ADD CONSTRAINT "nx10_team_task_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_team_task_log" ADD CONSTRAINT "nx10_team_task_log_team_task_id_fkey" FOREIGN KEY ("team_task_id") REFERENCES "nx10_team_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx10_team_task_log" ADD CONSTRAINT "nx10_team_task_log_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx98_doc_link" ADD CONSTRAINT "nx98_doc_link_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_product_module_map" ADD CONSTRAINT "nx99_product_module_map_product_module_id_fkey" FOREIGN KEY ("product_module_id") REFERENCES "nx99_product_module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_release_item" ADD CONSTRAINT "nx99_release_item_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "nx99_release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "nx99_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription_item" ADD CONSTRAINT "nx99_subscription_item_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "nx99_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
