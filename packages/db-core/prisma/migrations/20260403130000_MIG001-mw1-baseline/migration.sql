-- MIG001 | MW1 Baseline | NX00 + NX99
-- 說明：MW1 第一包 baseline，含 nx00 全部主檔／RBAC／稽核，以及 nx99 租戶／方案／訂閱。
-- 注意：此為全新 baseline，舊 migration 鏈已封存至 prisma/_archive_migrations/（勿放在 migrations/ 內以免 Prisma 誤掃）。
-- 依賴：無（空庫直接套用）
-- MW1 baseline: PostgreSQL sequences + gen_*_id() for @default(dbgenerated(...)) in schema.prisma
-- (NX00 + NX99 only; no NX01-NX06)

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

CREATE SEQUENCE IF NOT EXISTS seq_nx00_user_warehouse_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_user_warehouse_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00USWA' || LPAD(nextval('seq_nx00_user_warehouse_id')::text, 7, '0');
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

CREATE SEQUENCE IF NOT EXISTS seq_nx00_coun_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_coun_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00COUN' || LPAD(nextval('seq_nx00_coun_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_curr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_curr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00CURR' || LPAD(nextval('seq_nx00_curr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_part_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_part_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PART' || LPAD(nextval('seq_nx00_part_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_pabr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_pabr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PABR' || LPAD(nextval('seq_nx00_pabr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_cabr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_cabr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00CABR' || LPAD(nextval('seq_nx00_cabr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_pagr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_pagr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PAGR' || LPAD(nextval('seq_nx00_pagr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_bcor_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_bcor_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BCOR' || LPAD(nextval('seq_nx00_bcor_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_pare_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_pare_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PARE' || LPAD(nextval('seq_nx00_pare_id')::text, 7, '0');
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

CREATE SEQUENCE IF NOT EXISTS seq_nx00_bull_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_bull_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BULL' || LPAD(nextval('seq_nx00_bull_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_caev_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_caev_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00CAEV' || LPAD(nextval('seq_nx00_caev_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =======================================================
-- NX99
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS nx99_tant_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_plan_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_subs_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_suit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmm_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_rele_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_reit_seq START 1;

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

CREATE OR REPLACE FUNCTION gen_nx99_rele_id()
RETURNS VARCHAR AS $$ SELECT 'NX99RELE' || LPAD(nextval('nx99_rele_seq')::text, 7, '0'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION gen_nx99_reit_id()
RETURNS VARCHAR AS $$ SELECT 'NX99REIT' || LPAD(nextval('nx99_reit_seq')::text, 7, '0'); $$ LANGUAGE sql;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "nx00_user" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_user_id(),
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
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_role" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_role_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
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
    "tenant_id" VARCHAR(15) NOT NULL,
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
CREATE TABLE "nx00_user_warehouse" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_user_warehouse_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" VARCHAR(15),
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nx00_user_warehouse_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "nx00_role_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_country" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_coun_id(),
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_currency" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_curr_id(),
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(5),
    "decimal_places" INTEGER NOT NULL DEFAULT 2,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_part" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_part_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
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
    "type" VARCHAR(1) NOT NULL DEFAULT 'A',
    "part_group_id" VARCHAR(15),
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
CREATE TABLE "nx00_part_brand" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_pabr_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "country_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_part_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_car_brand" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_cabr_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "country_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_car_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_part_group" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_pagr_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_part_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_brand_code_role" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_bcor_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_brand_id" VARCHAR(15) NOT NULL,
    "seg1" INTEGER NOT NULL DEFAULT 0,
    "seg2" INTEGER NOT NULL DEFAULT 0,
    "seg3" INTEGER NOT NULL DEFAULT 0,
    "seg4" INTEGER NOT NULL DEFAULT 0,
    "seg5" INTEGER NOT NULL DEFAULT 0,
    "code_format" VARCHAR(20) NOT NULL,
    "brand_sort" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_brand_code_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_part_relation" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_pare_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_id_from" VARCHAR(15) NOT NULL,
    "part_id_to" VARCHAR(15) NOT NULL,
    "relation_type" VARCHAR(1) NOT NULL,
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_part_relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_warehouse" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_warehouse_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
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
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_partner" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_partner_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "partner_type" VARCHAR(1) NOT NULL DEFAULT 'C',
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

    CONSTRAINT "nx00_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_bulletin" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_bull_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "content" TEXT,
    "type" VARCHAR(1) NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "expired_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_bulletin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_calendar_event" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_caev_id(),
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
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_tenant" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_tant_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(200),
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
CREATE TABLE "nx99_release" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_rele_id(),
    "version_code" VARCHAR(30) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "released_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx99_release_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_reit_id(),
    "release_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nx99_release_item_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "nx00_user_tenant_id_idx" ON "nx00_user"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_user_tenant_id_user_account_key" ON "nx00_user"("tenant_id", "user_account");

-- CreateIndex
CREATE INDEX "nx00_role_tenant_id_idx" ON "nx00_role"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_role_tenant_id_code_key" ON "nx00_role"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx00_user_role_tenant_id_idx" ON "nx00_user_role"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_user_role_user_id_idx" ON "nx00_user_role"("user_id");

-- CreateIndex
CREATE INDEX "nx00_user_role_role_id_idx" ON "nx00_user_role"("role_id");

-- CreateIndex
CREATE INDEX "nx00_user_role_is_active_idx" ON "nx00_user_role"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_user_role_tenant_id_user_id_role_id_key" ON "nx00_user_role"("tenant_id", "user_id", "role_id");

-- CreateIndex
CREATE INDEX "nx00_user_warehouse_tenant_id_idx" ON "nx00_user_warehouse"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_user_warehouse_user_id_idx" ON "nx00_user_warehouse"("user_id");

-- CreateIndex
CREATE INDEX "nx00_user_warehouse_warehouse_id_idx" ON "nx00_user_warehouse"("warehouse_id");

-- CreateIndex
CREATE INDEX "nx00_user_warehouse_is_active_idx" ON "nx00_user_warehouse"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_user_warehouse_tenant_id_user_id_warehouse_id_key" ON "nx00_user_warehouse"("tenant_id", "user_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_view_code_key" ON "nx00_view"("code");

-- CreateIndex
CREATE INDEX "nx00_view_module_code_idx" ON "nx00_view"("module_code");

-- CreateIndex
CREATE INDEX "nx00_view_is_active_idx" ON "nx00_view"("is_active");

-- CreateIndex
CREATE INDEX "nx00_role_view_tenant_id_idx" ON "nx00_role_view"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_role_view_role_id_idx" ON "nx00_role_view"("role_id");

-- CreateIndex
CREATE INDEX "nx00_role_view_view_id_idx" ON "nx00_role_view"("view_id");

-- CreateIndex
CREATE INDEX "nx00_role_view_is_active_idx" ON "nx00_role_view"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_role_view_tenant_id_role_id_view_id_key" ON "nx00_role_view"("tenant_id", "role_id", "view_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_country_code_key" ON "nx00_country"("code");

-- CreateIndex
CREATE INDEX "nx00_country_is_active_idx" ON "nx00_country"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_currency_code_key" ON "nx00_currency"("code");

-- CreateIndex
CREATE INDEX "nx00_currency_is_active_idx" ON "nx00_currency"("is_active");

-- CreateIndex
CREATE INDEX "nx00_part_tenant_id_idx" ON "nx00_part"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_part_part_brand_id_idx" ON "nx00_part"("part_brand_id");

-- CreateIndex
CREATE INDEX "nx00_part_country_id_idx" ON "nx00_part"("country_id");

-- CreateIndex
CREATE INDEX "nx00_part_part_group_id_idx" ON "nx00_part"("part_group_id");

-- CreateIndex
CREATE INDEX "nx00_part_is_active_idx" ON "nx00_part"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_part_tenant_id_code_key" ON "nx00_part"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx00_part_brand_tenant_id_idx" ON "nx00_part_brand"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_part_brand_country_id_idx" ON "nx00_part_brand"("country_id");

-- CreateIndex
CREATE INDEX "nx00_part_brand_is_active_idx" ON "nx00_part_brand"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_part_brand_tenant_id_code_key" ON "nx00_part_brand"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx00_car_brand_tenant_id_idx" ON "nx00_car_brand"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_car_brand_country_id_idx" ON "nx00_car_brand"("country_id");

-- CreateIndex
CREATE INDEX "nx00_car_brand_is_active_idx" ON "nx00_car_brand"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_car_brand_tenant_id_code_key" ON "nx00_car_brand"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx00_part_group_tenant_id_idx" ON "nx00_part_group"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_part_group_is_active_idx" ON "nx00_part_group"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_part_group_tenant_id_code_key" ON "nx00_part_group"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_brand_code_role_part_brand_id_key" ON "nx00_brand_code_role"("part_brand_id");

-- CreateIndex
CREATE INDEX "nx00_brand_code_role_tenant_id_idx" ON "nx00_brand_code_role"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_brand_code_role_is_active_idx" ON "nx00_brand_code_role"("is_active");

-- CreateIndex
CREATE INDEX "nx00_part_relation_tenant_id_idx" ON "nx00_part_relation"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_part_relation_part_id_from_idx" ON "nx00_part_relation"("part_id_from");

-- CreateIndex
CREATE INDEX "nx00_part_relation_part_id_to_idx" ON "nx00_part_relation"("part_id_to");

-- CreateIndex
CREATE INDEX "nx00_part_relation_is_active_idx" ON "nx00_part_relation"("is_active");

-- CreateIndex
CREATE INDEX "nx00_warehouse_tenant_id_idx" ON "nx00_warehouse"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_warehouse_is_active_idx" ON "nx00_warehouse"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_warehouse_tenant_id_code_key" ON "nx00_warehouse"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx00_location_tenant_id_idx" ON "nx00_location"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_location_warehouse_id_idx" ON "nx00_location"("warehouse_id");

-- CreateIndex
CREATE INDEX "nx00_location_is_active_idx" ON "nx00_location"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_location_tenant_id_warehouse_id_code_key" ON "nx00_location"("tenant_id", "warehouse_id", "code");

-- CreateIndex
CREATE INDEX "nx00_partner_tenant_id_idx" ON "nx00_partner"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_partner_is_active_idx" ON "nx00_partner"("is_active");

-- CreateIndex
CREATE INDEX "nx00_partner_partner_type_idx" ON "nx00_partner"("partner_type");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_partner_tenant_id_code_key" ON "nx00_partner"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx00_audit_log_tenant_id_idx" ON "nx00_audit_log"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_audit_log_occurred_at_idx" ON "nx00_audit_log"("occurred_at");

-- CreateIndex
CREATE INDEX "nx00_audit_log_actor_user_id_idx" ON "nx00_audit_log"("actor_user_id");

-- CreateIndex
CREATE INDEX "nx00_audit_log_module_code_idx" ON "nx00_audit_log"("module_code");

-- CreateIndex
CREATE INDEX "nx00_audit_log_entity_table_idx" ON "nx00_audit_log"("entity_table");

-- CreateIndex
CREATE INDEX "nx00_bulletin_tenant_id_idx" ON "nx00_bulletin"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_bulletin_type_idx" ON "nx00_bulletin"("type");

-- CreateIndex
CREATE INDEX "nx00_bulletin_is_active_idx" ON "nx00_bulletin"("is_active");

-- CreateIndex
CREATE INDEX "nx00_calendar_event_tenant_id_idx" ON "nx00_calendar_event"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_calendar_event_date_start_idx" ON "nx00_calendar_event"("date_start");

-- CreateIndex
CREATE INDEX "nx00_calendar_event_is_active_idx" ON "nx00_calendar_event"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_tenant_code_key" ON "nx99_tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_release_version_code_key" ON "nx99_release"("version_code");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_plan_code_key" ON "nx99_plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx99_product_module_code_key" ON "nx99_product_module"("code");

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role" ADD CONSTRAINT "nx00_role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role" ADD CONSTRAINT "nx00_role_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role" ADD CONSTRAINT "nx00_role_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx00_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_warehouse" ADD CONSTRAINT "nx00_user_warehouse_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_warehouse" ADD CONSTRAINT "nx00_user_warehouse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_warehouse" ADD CONSTRAINT "nx00_user_warehouse_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_warehouse" ADD CONSTRAINT "nx00_user_warehouse_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_view" ADD CONSTRAINT "nx00_view_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_view" ADD CONSTRAINT "nx00_view_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx00_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "nx00_view"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_country" ADD CONSTRAINT "nx00_country_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_country" ADD CONSTRAINT "nx00_country_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_currency" ADD CONSTRAINT "nx00_currency_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_currency" ADD CONSTRAINT "nx00_currency_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "nx00_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_part_group_id_fkey" FOREIGN KEY ("part_group_id") REFERENCES "nx00_part_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_part_brand_id_fkey" FOREIGN KEY ("part_brand_id") REFERENCES "nx00_part_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_brand" ADD CONSTRAINT "nx00_part_brand_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_brand" ADD CONSTRAINT "nx00_part_brand_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "nx00_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_brand" ADD CONSTRAINT "nx00_part_brand_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_brand" ADD CONSTRAINT "nx00_part_brand_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_car_brand" ADD CONSTRAINT "nx00_car_brand_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_car_brand" ADD CONSTRAINT "nx00_car_brand_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "nx00_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_car_brand" ADD CONSTRAINT "nx00_car_brand_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_car_brand" ADD CONSTRAINT "nx00_car_brand_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_group" ADD CONSTRAINT "nx00_part_group_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_group" ADD CONSTRAINT "nx00_part_group_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_group" ADD CONSTRAINT "nx00_part_group_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_brand_code_role" ADD CONSTRAINT "nx00_brand_code_role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_brand_code_role" ADD CONSTRAINT "nx00_brand_code_role_part_brand_id_fkey" FOREIGN KEY ("part_brand_id") REFERENCES "nx00_part_brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_brand_code_role" ADD CONSTRAINT "nx00_brand_code_role_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_brand_code_role" ADD CONSTRAINT "nx00_brand_code_role_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_relation" ADD CONSTRAINT "nx00_part_relation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_relation" ADD CONSTRAINT "nx00_part_relation_part_id_from_fkey" FOREIGN KEY ("part_id_from") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_relation" ADD CONSTRAINT "nx00_part_relation_part_id_to_fkey" FOREIGN KEY ("part_id_to") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_relation" ADD CONSTRAINT "nx00_part_relation_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part_relation" ADD CONSTRAINT "nx00_part_relation_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_warehouse" ADD CONSTRAINT "nx00_warehouse_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_warehouse" ADD CONSTRAINT "nx00_warehouse_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_warehouse" ADD CONSTRAINT "nx00_warehouse_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_partner" ADD CONSTRAINT "nx00_partner_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_partner" ADD CONSTRAINT "nx00_partner_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_partner" ADD CONSTRAINT "nx00_partner_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_audit_log" ADD CONSTRAINT "nx00_audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_audit_log" ADD CONSTRAINT "nx00_audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_bulletin" ADD CONSTRAINT "nx00_bulletin_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_bulletin" ADD CONSTRAINT "nx00_bulletin_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_bulletin" ADD CONSTRAINT "nx00_bulletin_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_calendar_event" ADD CONSTRAINT "nx00_calendar_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_calendar_event" ADD CONSTRAINT "nx00_calendar_event_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_calendar_event" ADD CONSTRAINT "nx00_calendar_event_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_release_item" ADD CONSTRAINT "nx99_release_item_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "nx99_release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "nx99_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_subscription_item" ADD CONSTRAINT "nx99_subscription_item_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "nx99_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx99_product_module_map" ADD CONSTRAINT "nx99_product_module_map_product_module_id_fkey" FOREIGN KEY ("product_module_id") REFERENCES "nx99_product_module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

