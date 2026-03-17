-- =======================================================
-- NX99 - Draft migration: 6 tables + sequences + ID functions
-- 使用方式：執行 pnpm prisma migrate dev --name add-nx99-models 後，
-- 將本檔內容覆蓋貼上至產生的 migration.sql 檔案末端（或取代其內容後貼上整份）。
-- 若 Prisma 已產生 CREATE TABLE，則僅保留「Sequence + Function」區塊貼到該 migration 末端。
-- =======================================================

-- =============================================
-- NX99 ID 產生用 Sequence
-- =============================================
CREATE SEQUENCE IF NOT EXISTS nx99_tant_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_plan_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_subs_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_suit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmm_seq START 1;

-- =============================================
-- NX99 ID 產生函式（風格對齊現有 gen_nx00_xxx_id()）
-- =============================================
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

-- =============================================
-- NX99 CREATE TABLE（6 張表）
-- =============================================

-- CreateTable: nx99_tenant
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: nx99_plan
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: nx99_product_module（無 FK，先建）
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_product_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable: nx99_product_module_map
CREATE TABLE "nx99_product_module_map" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx99_prmm_id(),
    "product_module_id" VARCHAR(15) NOT NULL,
    "app_module_code" VARCHAR(10) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_product_module_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable: nx99_subscription
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable: nx99_subscription_item
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx99_subscription_item_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- CreateIndex
-- =============================================
CREATE UNIQUE INDEX "nx99_tenant_code_key" ON "nx99_tenant"("code");

CREATE UNIQUE INDEX "nx99_plan_code_key" ON "nx99_plan"("code");

CREATE UNIQUE INDEX "nx99_product_module_code_key" ON "nx99_product_module"("code");
CREATE INDEX "nx99_product_module_map_product_module_id_idx" ON "nx99_product_module_map"("product_module_id");

CREATE INDEX "nx99_subscription_tenant_id_idx" ON "nx99_subscription"("tenant_id");
CREATE INDEX "nx99_subscription_plan_id_idx" ON "nx99_subscription"("plan_id");

CREATE INDEX "nx99_subscription_item_subscription_id_idx" ON "nx99_subscription_item"("subscription_id");

-- =============================================
-- AddForeignKey
-- =============================================
ALTER TABLE "nx99_product_module_map" ADD CONSTRAINT "nx99_product_module_map_product_module_id_fkey" FOREIGN KEY ("product_module_id") REFERENCES "nx99_product_module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "nx99_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx99_subscription_item" ADD CONSTRAINT "nx99_subscription_item_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "nx99_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
