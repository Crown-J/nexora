-- MIG005：NX01 採購完整表（PO／RR／PR）＋ RFQ 表頭／明細對齊 docs/nx01_field.csv

-- ---------------------------------------------------------------------------
-- 1) nx01_rfq：補 contact、作廢、供應商 FK
-- ---------------------------------------------------------------------------
ALTER TABLE "nx01_rfq" ADD COLUMN IF NOT EXISTS "contact_name" VARCHAR(50);
ALTER TABLE "nx01_rfq" ADD COLUMN IF NOT EXISTS "contact_phone" VARCHAR(30);
ALTER TABLE "nx01_rfq" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMPTZ;
ALTER TABLE "nx01_rfq" ADD COLUMN IF NOT EXISTS "voided_by" VARCHAR(15);

ALTER TABLE "nx01_rfq" DROP CONSTRAINT IF EXISTS "nx01_rfq_supplier_id_fkey";
ALTER TABLE "nx01_rfq" ADD CONSTRAINT "nx01_rfq_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_rfq" DROP CONSTRAINT IF EXISTS "nx01_rfq_voided_by_fkey";
ALTER TABLE "nx01_rfq" ADD CONSTRAINT "nx01_rfq_voided_by_fkey"
  FOREIGN KEY ("voided_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2) nx01_rfq_item：對齊欄位（qty、快照、幣別、報價、明細狀態）
-- ---------------------------------------------------------------------------
ALTER TABLE "nx01_rfq_item" ADD COLUMN IF NOT EXISTS "part_no" VARCHAR(50);
ALTER TABLE "nx01_rfq_item" ADD COLUMN IF NOT EXISTS "part_name" VARCHAR(200);
UPDATE "nx01_rfq_item" ri
SET "part_no" = p."code", "part_name" = p."name"
FROM "nx00_part" p
WHERE p."id" = ri."part_id" AND (ri."part_no" IS NULL OR ri."part_name" IS NULL);
ALTER TABLE "nx01_rfq_item" ALTER COLUMN "part_no" SET NOT NULL;
ALTER TABLE "nx01_rfq_item" ALTER COLUMN "part_name" SET NOT NULL;

ALTER TABLE "nx01_rfq_item" ADD COLUMN IF NOT EXISTS "currency_id" VARCHAR(15);
UPDATE "nx01_rfq_item" ri
SET "currency_id" = c."id"
FROM "nx00_currency" c
WHERE c."code" = 'TWD' AND ri."currency_id" IS NULL;
ALTER TABLE "nx01_rfq_item" ALTER COLUMN "currency_id" SET NOT NULL;

ALTER TABLE "nx01_rfq_item" ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(14, 4);
ALTER TABLE "nx01_rfq_item" ADD COLUMN IF NOT EXISTS "lead_time_days" INTEGER;
ALTER TABLE "nx01_rfq_item" ADD COLUMN IF NOT EXISTS "status" VARCHAR(1) NOT NULL DEFAULT 'P';

ALTER TABLE "nx01_rfq_item" RENAME COLUMN "qty_requested" TO "qty";

ALTER TABLE "nx01_rfq_item" DROP CONSTRAINT IF EXISTS "nx01_rfq_item_currency_id_fkey";
ALTER TABLE "nx01_rfq_item" ADD CONSTRAINT "nx01_rfq_item_currency_id_fkey"
  FOREIGN KEY ("currency_id") REFERENCES "nx00_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMENT ON COLUMN "nx01_rfq_item"."status" IS 'P=待回覆 R=已回覆 S=已選定 C=未採用';

-- ---------------------------------------------------------------------------
-- 3) ID：PO（若尚未建立）＋ RR／PR
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS "nx01_poht_seq" START WITH 1;
CREATE SEQUENCE IF NOT EXISTS "nx01_poit_seq" START WITH 1;
CREATE SEQUENCE IF NOT EXISTS "nx01_rrht_seq" START WITH 1;
CREATE SEQUENCE IF NOT EXISTS "nx01_rrit_seq" START WITH 1;
CREATE SEQUENCE IF NOT EXISTS "nx01_prht_seq" START WITH 1;
CREATE SEQUENCE IF NOT EXISTS "nx01_prit_seq" START WITH 1;

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

CREATE OR REPLACE FUNCTION gen_nx01_rrht_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_rrht_seq');
  RETURN 'NX01RRHT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_rrit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_rrit_seq');
  RETURN 'NX01RRIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_prht_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_prht_seq');
  RETURN 'NX01PRHT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_prit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_prit_seq');
  RETURN 'NX01PRIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- ---------------------------------------------------------------------------
-- 4) nx01_po / nx01_po_item
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "nx01_po" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_poht_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "po_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15) NOT NULL,
    "rfq_id" VARCHAR(15),
    "currency_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "subtotal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(14, 2) NOT NULL DEFAULT 5,
    "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "expected_date" DATE,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    "voided_at" TIMESTAMPTZ,
    "voided_by" VARCHAR(15),
    CONSTRAINT "nx01_po_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_po_tenant_id_doc_no_key" ON "nx01_po"("tenant_id", "doc_no");
CREATE INDEX IF NOT EXISTS "nx01_po_tenant_id_idx" ON "nx01_po"("tenant_id");
CREATE INDEX IF NOT EXISTS "nx01_po_supplier_id_idx" ON "nx01_po"("supplier_id");
CREATE INDEX IF NOT EXISTS "nx01_po_status_idx" ON "nx01_po"("status");
CREATE INDEX IF NOT EXISTS "nx01_po_rfq_id_idx" ON "nx01_po"("rfq_id");

ALTER TABLE "nx01_po" DROP CONSTRAINT IF EXISTS "nx01_po_tenant_id_fkey";
ALTER TABLE "nx01_po" ADD CONSTRAINT "nx01_po_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_po" DROP CONSTRAINT IF EXISTS "nx01_po_supplier_id_fkey";
ALTER TABLE "nx01_po" ADD CONSTRAINT "nx01_po_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_po" DROP CONSTRAINT IF EXISTS "nx01_po_rfq_id_fkey";
ALTER TABLE "nx01_po" ADD CONSTRAINT "nx01_po_rfq_id_fkey"
  FOREIGN KEY ("rfq_id") REFERENCES "nx01_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_po" DROP CONSTRAINT IF EXISTS "nx01_po_currency_id_fkey";
ALTER TABLE "nx01_po" ADD CONSTRAINT "nx01_po_currency_id_fkey"
  FOREIGN KEY ("currency_id") REFERENCES "nx00_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_po" DROP CONSTRAINT IF EXISTS "nx01_po_created_by_fkey";
ALTER TABLE "nx01_po" ADD CONSTRAINT "nx01_po_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_po" DROP CONSTRAINT IF EXISTS "nx01_po_updated_by_fkey";
ALTER TABLE "nx01_po" ADD CONSTRAINT "nx01_po_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_po" DROP CONSTRAINT IF EXISTS "nx01_po_voided_by_fkey";
ALTER TABLE "nx01_po" ADD CONSTRAINT "nx01_po_voided_by_fkey"
  FOREIGN KEY ("voided_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx01_po_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_poit_id(),
    "po_id" VARCHAR(15) NOT NULL,
    "rfq_item_id" VARCHAR(15),
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "qty" DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "received_qty" DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "expected_date" DATE,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx01_po_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_po_item_po_id_line_no_key" ON "nx01_po_item"("po_id", "line_no");
CREATE INDEX IF NOT EXISTS "nx01_po_item_po_id_idx" ON "nx01_po_item"("po_id");
CREATE INDEX IF NOT EXISTS "nx01_po_item_part_id_idx" ON "nx01_po_item"("part_id");
CREATE INDEX IF NOT EXISTS "nx01_po_item_rfq_item_id_idx" ON "nx01_po_item"("rfq_item_id");

ALTER TABLE "nx01_po_item" DROP CONSTRAINT IF EXISTS "nx01_po_item_po_id_fkey";
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_po_id_fkey"
  FOREIGN KEY ("po_id") REFERENCES "nx01_po"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx01_po_item" DROP CONSTRAINT IF EXISTS "nx01_po_item_rfq_item_id_fkey";
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_rfq_item_id_fkey"
  FOREIGN KEY ("rfq_item_id") REFERENCES "nx01_rfq_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_po_item" DROP CONSTRAINT IF EXISTS "nx01_po_item_part_id_fkey";
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_po_item" DROP CONSTRAINT IF EXISTS "nx01_po_item_created_by_fkey";
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_po_item" DROP CONSTRAINT IF EXISTS "nx01_po_item_updated_by_fkey";
ALTER TABLE "nx01_po_item" ADD CONSTRAINT "nx01_po_item_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 5) nx01_rr / nx01_rr_item
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "nx01_rr" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_rrht_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "rr_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15) NOT NULL,
    "rfq_id" VARCHAR(15),
    "po_id" VARCHAR(15),
    "currency_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "subtotal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5, 2) NOT NULL DEFAULT 5,
    "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    "posted_at" TIMESTAMPTZ,
    "posted_by" VARCHAR(15),
    "voided_at" TIMESTAMPTZ,
    "voided_by" VARCHAR(15),
    CONSTRAINT "nx01_rr_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_rr_tenant_id_doc_no_key" ON "nx01_rr"("tenant_id", "doc_no");
CREATE INDEX IF NOT EXISTS "nx01_rr_tenant_id_idx" ON "nx01_rr"("tenant_id");
CREATE INDEX IF NOT EXISTS "nx01_rr_warehouse_id_idx" ON "nx01_rr"("warehouse_id");
CREATE INDEX IF NOT EXISTS "nx01_rr_supplier_id_idx" ON "nx01_rr"("supplier_id");
CREATE INDEX IF NOT EXISTS "nx01_rr_status_idx" ON "nx01_rr"("status");

ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_tenant_id_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_warehouse_id_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_supplier_id_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_rfq_id_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_rfq_id_fkey"
  FOREIGN KEY ("rfq_id") REFERENCES "nx01_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_po_id_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_po_id_fkey"
  FOREIGN KEY ("po_id") REFERENCES "nx01_po"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_currency_id_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_currency_id_fkey"
  FOREIGN KEY ("currency_id") REFERENCES "nx00_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_created_by_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_updated_by_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_posted_by_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_posted_by_fkey"
  FOREIGN KEY ("posted_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_rr" DROP CONSTRAINT IF EXISTS "nx01_rr_voided_by_fkey";
ALTER TABLE "nx01_rr" ADD CONSTRAINT "nx01_rr_voided_by_fkey"
  FOREIGN KEY ("voided_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx01_rr_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_rrit_id(),
    "rr_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "location_id" VARCHAR(15) NOT NULL,
    "qty" DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "po_item_id" VARCHAR(15),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx01_rr_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_rr_item_rr_id_line_no_key" ON "nx01_rr_item"("rr_id", "line_no");
CREATE INDEX IF NOT EXISTS "nx01_rr_item_rr_id_idx" ON "nx01_rr_item"("rr_id");
CREATE INDEX IF NOT EXISTS "nx01_rr_item_part_id_idx" ON "nx01_rr_item"("part_id");
CREATE INDEX IF NOT EXISTS "nx01_rr_item_location_id_idx" ON "nx01_rr_item"("location_id");
CREATE INDEX IF NOT EXISTS "nx01_rr_item_po_item_id_idx" ON "nx01_rr_item"("po_item_id");

ALTER TABLE "nx01_rr_item" DROP CONSTRAINT IF EXISTS "nx01_rr_item_rr_id_fkey";
ALTER TABLE "nx01_rr_item" ADD CONSTRAINT "nx01_rr_item_rr_id_fkey"
  FOREIGN KEY ("rr_id") REFERENCES "nx01_rr"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx01_rr_item" DROP CONSTRAINT IF EXISTS "nx01_rr_item_part_id_fkey";
ALTER TABLE "nx01_rr_item" ADD CONSTRAINT "nx01_rr_item_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_rr_item" DROP CONSTRAINT IF EXISTS "nx01_rr_item_location_id_fkey";
ALTER TABLE "nx01_rr_item" ADD CONSTRAINT "nx01_rr_item_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_rr_item" DROP CONSTRAINT IF EXISTS "nx01_rr_item_po_item_id_fkey";
ALTER TABLE "nx01_rr_item" ADD CONSTRAINT "nx01_rr_item_po_item_id_fkey"
  FOREIGN KEY ("po_item_id") REFERENCES "nx01_po_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_rr_item" DROP CONSTRAINT IF EXISTS "nx01_rr_item_created_by_fkey";
ALTER TABLE "nx01_rr_item" ADD CONSTRAINT "nx01_rr_item_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_rr_item" DROP CONSTRAINT IF EXISTS "nx01_rr_item_updated_by_fkey";
ALTER TABLE "nx01_rr_item" ADD CONSTRAINT "nx01_rr_item_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 6) nx01_pr / nx01_pr_item
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "nx01_pr" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_prht_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "pr_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15) NOT NULL,
    "rr_id" VARCHAR(15),
    "currency_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "subtotal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5, 2) NOT NULL DEFAULT 5,
    "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    "posted_at" TIMESTAMPTZ,
    "posted_by" VARCHAR(15),
    "voided_at" TIMESTAMPTZ,
    "voided_by" VARCHAR(15),
    CONSTRAINT "nx01_pr_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_pr_tenant_id_doc_no_key" ON "nx01_pr"("tenant_id", "doc_no");
CREATE INDEX IF NOT EXISTS "nx01_pr_tenant_id_idx" ON "nx01_pr"("tenant_id");
CREATE INDEX IF NOT EXISTS "nx01_pr_warehouse_id_idx" ON "nx01_pr"("warehouse_id");
CREATE INDEX IF NOT EXISTS "nx01_pr_supplier_id_idx" ON "nx01_pr"("supplier_id");
CREATE INDEX IF NOT EXISTS "nx01_pr_rr_id_idx" ON "nx01_pr"("rr_id");
CREATE INDEX IF NOT EXISTS "nx01_pr_status_idx" ON "nx01_pr"("status");

ALTER TABLE "nx01_pr" DROP CONSTRAINT IF EXISTS "nx01_pr_tenant_id_fkey";
ALTER TABLE "nx01_pr" ADD CONSTRAINT "nx01_pr_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_pr" DROP CONSTRAINT IF EXISTS "nx01_pr_warehouse_id_fkey";
ALTER TABLE "nx01_pr" ADD CONSTRAINT "nx01_pr_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_pr" DROP CONSTRAINT IF EXISTS "nx01_pr_supplier_id_fkey";
ALTER TABLE "nx01_pr" ADD CONSTRAINT "nx01_pr_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "nx00_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_pr" DROP CONSTRAINT IF EXISTS "nx01_pr_rr_id_fkey";
ALTER TABLE "nx01_pr" ADD CONSTRAINT "nx01_pr_rr_id_fkey"
  FOREIGN KEY ("rr_id") REFERENCES "nx01_rr"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_pr" DROP CONSTRAINT IF EXISTS "nx01_pr_currency_id_fkey";
ALTER TABLE "nx01_pr" ADD CONSTRAINT "nx01_pr_currency_id_fkey"
  FOREIGN KEY ("currency_id") REFERENCES "nx00_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_pr" DROP CONSTRAINT IF EXISTS "nx01_pr_created_by_fkey";
ALTER TABLE "nx01_pr" ADD CONSTRAINT "nx01_pr_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_pr" DROP CONSTRAINT IF EXISTS "nx01_pr_updated_by_fkey";
ALTER TABLE "nx01_pr" ADD CONSTRAINT "nx01_pr_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_pr" DROP CONSTRAINT IF EXISTS "nx01_pr_posted_by_fkey";
ALTER TABLE "nx01_pr" ADD CONSTRAINT "nx01_pr_posted_by_fkey"
  FOREIGN KEY ("posted_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_pr" DROP CONSTRAINT IF EXISTS "nx01_pr_voided_by_fkey";
ALTER TABLE "nx01_pr" ADD CONSTRAINT "nx01_pr_voided_by_fkey"
  FOREIGN KEY ("voided_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx01_pr_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_prit_id(),
    "pr_id" VARCHAR(15) NOT NULL,
    "rr_item_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "location_id" VARCHAR(15),
    "qty" DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14, 4) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx01_pr_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_pr_item_pr_id_line_no_key" ON "nx01_pr_item"("pr_id", "line_no");
CREATE INDEX IF NOT EXISTS "nx01_pr_item_pr_id_idx" ON "nx01_pr_item"("pr_id");
CREATE INDEX IF NOT EXISTS "nx01_pr_item_part_id_idx" ON "nx01_pr_item"("part_id");
CREATE INDEX IF NOT EXISTS "nx01_pr_item_rr_item_id_idx" ON "nx01_pr_item"("rr_item_id");
CREATE INDEX IF NOT EXISTS "nx01_pr_item_location_id_idx" ON "nx01_pr_item"("location_id");

ALTER TABLE "nx01_pr_item" DROP CONSTRAINT IF EXISTS "nx01_pr_item_pr_id_fkey";
ALTER TABLE "nx01_pr_item" ADD CONSTRAINT "nx01_pr_item_pr_id_fkey"
  FOREIGN KEY ("pr_id") REFERENCES "nx01_pr"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx01_pr_item" DROP CONSTRAINT IF EXISTS "nx01_pr_item_rr_item_id_fkey";
ALTER TABLE "nx01_pr_item" ADD CONSTRAINT "nx01_pr_item_rr_item_id_fkey"
  FOREIGN KEY ("rr_item_id") REFERENCES "nx01_rr_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_pr_item" DROP CONSTRAINT IF EXISTS "nx01_pr_item_part_id_fkey";
ALTER TABLE "nx01_pr_item" ADD CONSTRAINT "nx01_pr_item_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_pr_item" DROP CONSTRAINT IF EXISTS "nx01_pr_item_location_id_fkey";
ALTER TABLE "nx01_pr_item" ADD CONSTRAINT "nx01_pr_item_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx01_pr_item" DROP CONSTRAINT IF EXISTS "nx01_pr_item_created_by_fkey";
ALTER TABLE "nx01_pr_item" ADD CONSTRAINT "nx01_pr_item_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx01_pr_item" DROP CONSTRAINT IF EXISTS "nx01_pr_item_updated_by_fkey";
ALTER TABLE "nx01_pr_item" ADD CONSTRAINT "nx01_pr_item_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
