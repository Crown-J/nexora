-- packages/db-core/prisma/migrations/20260801000000_fin_master_a_phase/migration.sql
-- 總帳脊椎 A 階段：財會主檔（2026-08-01 執行長拍板，七題全數照建議）
--   規格：docs/專案/規格書/核心/NEXORA-財會主檔-schema規格-A階段.md v0.2
--   來源：亞羅《核心主檔 v1》14 張財會主檔 ＋ Hank 判定該有而補的 3 張（票據簿／折舊提列／資產類別）
-- 非破壞：18 張新表 additive；既有 3 表只 ADD COLUMN（nx01_partner +2、nx05_account_code +11、nx05_note +6），
--         舊欄一律不動（payment_term_domestic 85 處在讀、account_code.category 12 檔在讀）。
-- ⚠️ 本機 migration 追蹤表壞（shadow DB）→ 沿用 0720~0723 範式，用 prisma db execute 手動套。
-- ⚠️ 套用後請重跑 packages/db-core/scripts/gen-table-comments.mjs 同步欄位 COMMENT。

-- =========================================================
-- 1) ID 產生器（18 組 sequence + function）
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS seq_nx01_param_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_param_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PARM' || LPAD(nextval('seq_nx01_param_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_account_class_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_account_class_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ACLS' || LPAD(nextval('seq_nx05_account_class_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_tax_code_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_tax_code_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05TXCD' || LPAD(nextval('seq_nx05_tax_code_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_accounting_policy_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_accounting_policy_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ACPO' || LPAD(nextval('seq_nx05_accounting_policy_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_accounting_policy_exception_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_accounting_policy_exception_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ACPX' || LPAD(nextval('seq_nx05_accounting_policy_exception_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_pay_method_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_pay_method_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05PYMT' || LPAD(nextval('seq_nx05_pay_method_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_bank_account_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_bank_account_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05BKAC' || LPAD(nextval('seq_nx05_bank_account_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_payment_term_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_payment_term_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05PYTM' || LPAD(nextval('seq_nx05_payment_term_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_payment_term_line_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_payment_term_line_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05PYTL' || LPAD(nextval('seq_nx05_payment_term_line_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_fiscal_period_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_fiscal_period_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05FSPD' || LPAD(nextval('seq_nx05_fiscal_period_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_recurring_expense_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_recurring_expense_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05RCEX' || LPAD(nextval('seq_nx05_recurring_expense_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_invoice_track_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_invoice_track_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05INVT' || LPAD(nextval('seq_nx05_invoice_track_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_note_book_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_note_book_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05NTBK' || LPAD(nextval('seq_nx05_note_book_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_asset_class_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_asset_class_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ASCL' || LPAD(nextval('seq_nx05_asset_class_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_asset_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_asset_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ASST' || LPAD(nextval('seq_nx05_asset_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_asset_depreciation_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_asset_depreciation_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ASDP' || LPAD(nextval('seq_nx05_asset_depreciation_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_posting_rule_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_posting_rule_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05PSTR' || LPAD(nextval('seq_nx05_posting_rule_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_posting_rule_line_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_posting_rule_line_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05PSTL' || LPAD(nextval('seq_nx05_posting_rule_line_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =========================================================
-- 2) DDL（由 prisma migrate diff 產生、已逐條檢查：無 DROP / 無 ALTER COLUMN / 純 additive）
-- =========================================================
-- AlterTable
ALTER TABLE "nx01_partner" ADD COLUMN     "payment_term_id" VARCHAR(15),
ADD COLUMN     "payment_term_import_id" VARCHAR(15);

-- AlterTable
ALTER TABLE "nx05_account_code" ADD COLUMN     "account_class_id" VARCHAR(15),
ADD COLUMN     "cash_flow_type" VARCHAR(1) NOT NULL DEFAULT 'N',
ADD COLUMN     "default_tax_code_id" VARCHAR(15),
ADD COLUMN     "is_postable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "parent_id" VARCHAR(15),
ADD COLUMN     "partner_scope" VARCHAR(10) NOT NULL DEFAULT 'PARTNER',
ADD COLUMN     "require_dept" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "require_partner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sort_no" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "statement_section" VARCHAR(30);

-- AlterTable
ALTER TABLE "nx05_note" ADD COLUMN     "collection_bank_account_id" VARCHAR(15),
ADD COLUMN     "collection_date" DATE,
ADD COLUMN     "drawer_name" VARCHAR(100),
ADD COLUMN     "note_book_id" VARCHAR(15),
ADD COLUMN     "paying_bank_name" VARCHAR(100),
ADD COLUMN     "received_date" DATE;

-- CreateTable
CREATE TABLE "nx05_account_class" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_account_class_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(1) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "increase_side" VARCHAR(1) NOT NULL,
    "statement" VARCHAR(2) NOT NULL,
    "statement_section" VARCHAR(30) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_account_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_tax_code" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_tax_code_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "direction" VARCHAR(3) NOT NULL,
    "deductible" BOOLEAN,
    "document_type" VARCHAR(50),
    "tax_account_code_id" VARCHAR(15),
    "include_in_cost" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_tax_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_accounting_policy" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_accounting_policy_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "selected_value" VARCHAR(50) NOT NULL,
    "allowed_values" VARCHAR(300) NOT NULL,
    "change_policy" VARCHAR(20) NOT NULL DEFAULT 'CAUTION',
    "effective_from" DATE NOT NULL,
    "locked_at" TIMESTAMP(3),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_accounting_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_accounting_policy_exception" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_accounting_policy_exception_id(),
    "policy_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "scope_code" VARCHAR(30) NOT NULL,
    "scope_name" VARCHAR(100) NOT NULL,
    "exception_value" VARCHAR(50) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_accounting_policy_exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_pay_method" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_pay_method_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "apply_to" VARCHAR(1) NOT NULL,
    "account_code_id" VARCHAR(15),
    "is_immediate" BOOLEAN NOT NULL DEFAULT true,
    "settle_lag_days" INTEGER,
    "use_note_due_date" BOOLEAN NOT NULL DEFAULT false,
    "require_note_info" BOOLEAN NOT NULL DEFAULT false,
    "fee_account_code_id" VARCHAR(15),
    "affects_cash" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_pay_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_bank_account" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_bank_account_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "branch_name" VARCHAR(100),
    "account_no" VARCHAR(30),
    "account_type" VARCHAR(2) NOT NULL,
    "currency_id" VARCHAR(15) NOT NULL DEFAULT 'TWD',
    "purpose" VARCHAR(50),
    "account_code_id" VARCHAR(15),
    "opened_date" DATE,
    "closed_date" DATE,
    "is_primary_receipt" BOOLEAN NOT NULL DEFAULT false,
    "can_issue_check" BOOLEAN NOT NULL DEFAULT false,
    "sweep_source_account_id" VARCHAR(15),
    "net_bank_owner" VARCHAR(50),
    "status" VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_payment_term" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_payment_term_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "apply_to" VARCHAR(4) NOT NULL DEFAULT 'AP',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_payment_term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_payment_term_line" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_payment_term_line_id(),
    "term_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "trigger_point" VARCHAR(3) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "days_after_trigger" INTEGER NOT NULL DEFAULT 0,
    "pay_method_id" VARCHAR(15),
    "note_days" INTEGER,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_payment_term_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_fiscal_period" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_fiscal_period_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(7) NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "period_no" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    "closed_at" TIMESTAMP(3),
    "closed_by" VARCHAR(15),
    "is_year_end" BOOLEAN NOT NULL DEFAULT false,
    "gate_bank_rec_diff" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gate_petty_cash_diff" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gate_landed_cost_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gate_asset_diff" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "can_close" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_fiscal_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_recurring_expense" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_recurring_expense_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "account_code_id" VARCHAR(15),
    "frequency" VARCHAR(1) NOT NULL DEFAULT 'M',
    "day_of_period" INTEGER NOT NULL DEFAULT 1,
    "pay_method_id" VARCHAR(15),
    "partner_id" VARCHAR(15),
    "estimated_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "annualized_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "approval_path" VARCHAR(1) NOT NULL DEFAULT 'A',
    "approval_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "approved_by" VARCHAR(15),
    "approved_at" TIMESTAMP(3),
    "anomaly_multiplier" DECIMAL(4,2),
    "next_due_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_recurring_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_invoice_track" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_invoice_track_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "period_code" VARCHAR(7) NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "track_code" VARCHAR(10) NOT NULL,
    "start_no" VARCHAR(20) NOT NULL,
    "end_no" VARCHAR(20) NOT NULL,
    "allocated_count" INTEGER NOT NULL DEFAULT 0,
    "issued_to_no" VARCHAR(20),
    "issued_count" INTEGER NOT NULL DEFAULT 0,
    "voided_count" INTEGER NOT NULL DEFAULT 0,
    "unused_count" INTEGER NOT NULL DEFAULT 0,
    "filed_at" TIMESTAMP(3),
    "filed_by" VARCHAR(15),
    "status" VARCHAR(20) NOT NULL DEFAULT 'UNALLOCATED',
    "remark" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_invoice_track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_note_book" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_note_book_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "bank_account_id" VARCHAR(15) NOT NULL,
    "note_type" VARCHAR(2) NOT NULL DEFAULT 'CK',
    "start_no" VARCHAR(20) NOT NULL,
    "end_no" VARCHAR(20) NOT NULL,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "issued_to_no" VARCHAR(20),
    "issued_count" INTEGER NOT NULL DEFAULT 0,
    "voided_count" INTEGER NOT NULL DEFAULT 0,
    "remaining_count" INTEGER NOT NULL DEFAULT 0,
    "received_date" DATE,
    "custodian_user_id" VARCHAR(15),
    "status" VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_note_book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_asset_class" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_asset_class_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "asset_account_code_id" VARCHAR(15),
    "accum_dep_account_code_id" VARCHAR(15),
    "default_useful_life" INTEGER,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_asset_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_asset" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_asset_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "asset_class_id" VARCHAR(15) NOT NULL,
    "acquire_date" DATE NOT NULL,
    "partner_id" VARCHAR(15),
    "invoice_no" VARCHAR(30),
    "acquire_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "useful_life_years" INTEGER NOT NULL DEFAULT 1,
    "is_capitalized" BOOLEAN NOT NULL DEFAULT true,
    "capitalize_batch_key" VARCHAR(60),
    "depreciation_method" VARCHAR(2) NOT NULL DEFAULT 'SL',
    "salvage_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dep_start_month" VARCHAR(7),
    "department_id" VARCHAR(15),
    "location_text" VARCHAR(100),
    "custodian_user_id" VARCHAR(15),
    "status" VARCHAR(1) NOT NULL DEFAULT 'A',
    "disposal_date" DATE,
    "disposal_method" VARCHAR(4),
    "disposal_reason" VARCHAR(200),
    "policy_no" VARCHAR(50),
    "lease_no" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_asset_depreciation" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_asset_depreciation_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "asset_id" VARCHAR(15) NOT NULL,
    "period_code" VARCHAR(7) NOT NULL,
    "dep_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "accum_dep_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net_book_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "posted_at" TIMESTAMP(3),
    "voucher_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_asset_depreciation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_posting_rule" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_posting_rule_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "cycle_code" VARCHAR(10) NOT NULL,
    "legal_cycle_code" VARCHAR(20) NOT NULL,
    "source_doc_type" VARCHAR(10),
    "is_auto" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_posting_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_posting_rule_line" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_posting_rule_line_id(),
    "rule_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "dr_cr" VARCHAR(1) NOT NULL,
    "account_code_id" VARCHAR(15),
    "account_pattern" VARCHAR(10),
    "amount_basis" VARCHAR(20) NOT NULL,
    "require_dept" BOOLEAN NOT NULL DEFAULT false,
    "require_partner" BOOLEAN NOT NULL DEFAULT false,
    "partner_scope" VARCHAR(10) NOT NULL DEFAULT 'PARTNER',
    "require_bank_account" BOOLEAN NOT NULL DEFAULT false,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "condition" VARCHAR(200),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_posting_rule_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx01_param" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_param_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "category_code" VARCHAR(30) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "attr1" VARCHAR(50),
    "attr2" VARCHAR(50),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_param_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx05_account_class_tenant_id_code_key" ON "nx05_account_class"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_tax_code_tenant_id_code_key" ON "nx05_tax_code"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_accounting_policy_tenant_id_code_key" ON "nx05_accounting_policy"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_accounting_policy_exception_policy_id_scope_code_key" ON "nx05_accounting_policy_exception"("policy_id", "scope_code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_pay_method_tenant_id_code_key" ON "nx05_pay_method"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_bank_account_tenant_id_code_key" ON "nx05_bank_account"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_payment_term_tenant_id_code_key" ON "nx05_payment_term"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_payment_term_line_term_id_line_no_key" ON "nx05_payment_term_line"("term_id", "line_no");

-- CreateIndex
CREATE INDEX "nx05_fiscal_period_tenant_id_fiscal_year_period_no_idx" ON "nx05_fiscal_period"("tenant_id", "fiscal_year", "period_no");

-- CreateIndex
CREATE INDEX "nx05_fiscal_period_tenant_id_status_idx" ON "nx05_fiscal_period"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_fiscal_period_tenant_id_code_key" ON "nx05_fiscal_period"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx05_recurring_expense_tenant_id_next_due_date_idx" ON "nx05_recurring_expense"("tenant_id", "next_due_date");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_recurring_expense_tenant_id_code_key" ON "nx05_recurring_expense"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx05_invoice_track_tenant_id_status_idx" ON "nx05_invoice_track"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_invoice_track_tenant_id_period_code_track_code_key" ON "nx05_invoice_track"("tenant_id", "period_code", "track_code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_note_book_tenant_id_code_key" ON "nx05_note_book"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_asset_class_tenant_id_code_key" ON "nx05_asset_class"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx05_asset_tenant_id_status_idx" ON "nx05_asset"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "nx05_asset_tenant_id_capitalize_batch_key_idx" ON "nx05_asset"("tenant_id", "capitalize_batch_key");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_asset_tenant_id_code_key" ON "nx05_asset"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nx05_asset_depreciation_tenant_id_period_code_idx" ON "nx05_asset_depreciation"("tenant_id", "period_code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_asset_depreciation_asset_id_period_code_key" ON "nx05_asset_depreciation"("asset_id", "period_code");

-- CreateIndex
CREATE INDEX "nx05_posting_rule_tenant_id_cycle_code_idx" ON "nx05_posting_rule"("tenant_id", "cycle_code");

-- CreateIndex
CREATE INDEX "nx05_posting_rule_tenant_id_source_doc_type_idx" ON "nx05_posting_rule"("tenant_id", "source_doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_posting_rule_tenant_id_code_key" ON "nx05_posting_rule"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_posting_rule_line_rule_id_line_no_key" ON "nx05_posting_rule_line"("rule_id", "line_no");

-- CreateIndex
CREATE INDEX "nx01_param_tenant_id_category_code_sort_no_idx" ON "nx01_param"("tenant_id", "category_code", "sort_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx01_param_tenant_id_category_code_code_key" ON "nx01_param"("tenant_id", "category_code", "code");

-- CreateIndex
CREATE INDEX "nx05_account_code_tenant_id_account_class_id_idx" ON "nx05_account_code"("tenant_id", "account_class_id");

-- AddForeignKey
ALTER TABLE "nx01_partner" ADD CONSTRAINT "nx01_partner_payment_term_id_fkey" FOREIGN KEY ("payment_term_id") REFERENCES "nx05_payment_term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner" ADD CONSTRAINT "nx01_partner_payment_term_import_id_fkey" FOREIGN KEY ("payment_term_import_id") REFERENCES "nx05_payment_term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_account_code" ADD CONSTRAINT "nx05_account_code_account_class_id_fkey" FOREIGN KEY ("account_class_id") REFERENCES "nx05_account_class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_account_code" ADD CONSTRAINT "nx05_account_code_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_account_code" ADD CONSTRAINT "nx05_account_code_default_tax_code_id_fkey" FOREIGN KEY ("default_tax_code_id") REFERENCES "nx05_tax_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note" ADD CONSTRAINT "nx05_note_collection_bank_account_id_fkey" FOREIGN KEY ("collection_bank_account_id") REFERENCES "nx05_bank_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note" ADD CONSTRAINT "nx05_note_note_book_id_fkey" FOREIGN KEY ("note_book_id") REFERENCES "nx05_note_book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_account_class" ADD CONSTRAINT "nx05_account_class_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_tax_code" ADD CONSTRAINT "nx05_tax_code_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_tax_code" ADD CONSTRAINT "nx05_tax_code_tax_account_code_id_fkey" FOREIGN KEY ("tax_account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_accounting_policy" ADD CONSTRAINT "nx05_accounting_policy_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_accounting_policy_exception" ADD CONSTRAINT "nx05_accounting_policy_exception_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "nx05_accounting_policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_pay_method" ADD CONSTRAINT "nx05_pay_method_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_pay_method" ADD CONSTRAINT "nx05_pay_method_account_code_id_fkey" FOREIGN KEY ("account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_pay_method" ADD CONSTRAINT "nx05_pay_method_fee_account_code_id_fkey" FOREIGN KEY ("fee_account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_bank_account" ADD CONSTRAINT "nx05_bank_account_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_bank_account" ADD CONSTRAINT "nx05_bank_account_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_bank_account" ADD CONSTRAINT "nx05_bank_account_account_code_id_fkey" FOREIGN KEY ("account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_bank_account" ADD CONSTRAINT "nx05_bank_account_sweep_source_account_id_fkey" FOREIGN KEY ("sweep_source_account_id") REFERENCES "nx05_bank_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_payment_term" ADD CONSTRAINT "nx05_payment_term_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_payment_term_line" ADD CONSTRAINT "nx05_payment_term_line_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "nx05_payment_term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_payment_term_line" ADD CONSTRAINT "nx05_payment_term_line_pay_method_id_fkey" FOREIGN KEY ("pay_method_id") REFERENCES "nx05_pay_method"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_fiscal_period" ADD CONSTRAINT "nx05_fiscal_period_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_recurring_expense" ADD CONSTRAINT "nx05_recurring_expense_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_recurring_expense" ADD CONSTRAINT "nx05_recurring_expense_account_code_id_fkey" FOREIGN KEY ("account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_recurring_expense" ADD CONSTRAINT "nx05_recurring_expense_pay_method_id_fkey" FOREIGN KEY ("pay_method_id") REFERENCES "nx05_pay_method"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_recurring_expense" ADD CONSTRAINT "nx05_recurring_expense_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_invoice_track" ADD CONSTRAINT "nx05_invoice_track_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note_book" ADD CONSTRAINT "nx05_note_book_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note_book" ADD CONSTRAINT "nx05_note_book_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "nx05_bank_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note_book" ADD CONSTRAINT "nx05_note_book_custodian_user_id_fkey" FOREIGN KEY ("custodian_user_id") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset_class" ADD CONSTRAINT "nx05_asset_class_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset_class" ADD CONSTRAINT "nx05_asset_class_asset_account_code_id_fkey" FOREIGN KEY ("asset_account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset_class" ADD CONSTRAINT "nx05_asset_class_accum_dep_account_code_id_fkey" FOREIGN KEY ("accum_dep_account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset" ADD CONSTRAINT "nx05_asset_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset" ADD CONSTRAINT "nx05_asset_asset_class_id_fkey" FOREIGN KEY ("asset_class_id") REFERENCES "nx05_asset_class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset" ADD CONSTRAINT "nx05_asset_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset" ADD CONSTRAINT "nx05_asset_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "nx01_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset" ADD CONSTRAINT "nx05_asset_custodian_user_id_fkey" FOREIGN KEY ("custodian_user_id") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset_depreciation" ADD CONSTRAINT "nx05_asset_depreciation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_asset_depreciation" ADD CONSTRAINT "nx05_asset_depreciation_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "nx05_asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_posting_rule" ADD CONSTRAINT "nx05_posting_rule_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_posting_rule_line" ADD CONSTRAINT "nx05_posting_rule_line_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "nx05_posting_rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_posting_rule_line" ADD CONSTRAINT "nx05_posting_rule_line_account_code_id_fkey" FOREIGN KEY ("account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_param" ADD CONSTRAINT "nx01_param_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =========================================================
-- 3) 表層 COMMENT（欄位 COMMENT 由 gen-table-comments.mjs 從 schema /// 註解同步）
-- =========================================================
COMMENT ON TABLE "nx01_param" IS '代碼參數表（限定用途：租戶可自訂值域池）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_account_class" IS '科目類別（8 類值域，決定借貸方向與財報歸屬）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_tax_code" IS '稅別（結構中性＝VAT 通則；台灣值域走 seed）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_accounting_policy" IS '會計政策（14 項，會被程式讀、不是文件）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_accounting_policy_exception" IS '會計政策例外（例：同行調貨採個別認定成本）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_pay_method" IS '收付方式（「多久才真的入帳」是 13 週現金預測的關鍵）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_bank_account" IS '銀行帳戶（帳戶是主檔不是會計科目）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_payment_term" IS '付款條件範本（觸發點×付款%×觸發後天數×工具）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_payment_term_line" IS '付款條件範本明細（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_fiscal_period" IS '會計期間（關帳四閘；與 nx05_closing 日結/401 期是兩件事）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_recurring_expense" IS '定期費用排程（資金循環唯一的事前核准點）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_invoice_track" IS '發票字軌（台灣皮：憑證編號區段管理）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_note_book" IS '票據簿（我方開出支票的連號管理）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_asset_class" IS '資產類別（帶資產科目與累計折舊科目兩屬性，故為主檔）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_asset" IS '資產主檔（財產目錄）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_asset_depreciation" IS '折舊提列明細（逐月落列；過帳後不可重算）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_posting_rule" IS '過帳規則／交易科目對映（總帳脊椎核心，63 個交易代號）（總帳脊椎 A 階段 2026-08-01）';
COMMENT ON TABLE "nx05_posting_rule_line" IS '過帳規則分錄行（借貸×科目×金額基礎×三維度旗標）（總帳脊椎 A 階段 2026-08-01）';

-- =========================================================
-- 4) 事後修正（2026-08-01 seed 實測發現）
--    nx05_tax_code.direction 值域為 IN / OUT / NA，VARCHAR(2) 裝不下 'OUT' → 純加寬為 VARCHAR(3)。
--    上面的 CREATE TABLE 已同步改為 VARCHAR(3)；本段是給「已套過舊版」的資料庫補的，重跑無副作用。
-- =========================================================
ALTER TABLE "nx05_tax_code" ALTER COLUMN "direction" TYPE VARCHAR(3);

--    nx05_account_code.remark 原為 VARCHAR(200)，但亞羅科目表的設計理由文字最長 229 字
--    （1122 進貨附加成本的運費防火牆說明）→ 純加寬為 VARCHAR(500)。既有 0 筆、無資料風險。
ALTER TABLE "nx05_account_code" ALTER COLUMN "remark" TYPE VARCHAR(500);
