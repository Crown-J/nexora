-- MIG004：NX01 RFQ 草稿表（MW2；供缺貨轉 RFQ），並將 nx02_shortage.ref_rfq_id 綁定外鍵

CREATE SEQUENCE IF NOT EXISTS nx01_rfqo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_rfit_seq START 1;

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

CREATE TABLE IF NOT EXISTS "nx01_rfq" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_rfqo_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "rfq_date" DATE NOT NULL,
    "supplier_id" VARCHAR(15),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TWD',
    "status" VARCHAR(1) NOT NULL DEFAULT 'D',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx01_rfq_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_rfq_tenant_id_doc_no_key" ON "nx01_rfq"("tenant_id", "doc_no");
CREATE INDEX IF NOT EXISTS "nx01_rfq_tenant_id_idx" ON "nx01_rfq"("tenant_id");
CREATE INDEX IF NOT EXISTS "nx01_rfq_status_idx" ON "nx01_rfq"("status");

ALTER TABLE "nx01_rfq" DROP CONSTRAINT IF EXISTS "nx01_rfq_tenant_id_fkey";
ALTER TABLE "nx01_rfq" ADD CONSTRAINT "nx01_rfq_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx01_rfq_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_rfit_id(),
    "rfq_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "qty_requested" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx01_rfq_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_rfq_item_rfq_id_line_no_key" ON "nx01_rfq_item"("rfq_id", "line_no");
CREATE INDEX IF NOT EXISTS "nx01_rfq_item_rfq_id_idx" ON "nx01_rfq_item"("rfq_id");
CREATE INDEX IF NOT EXISTS "nx01_rfq_item_part_id_idx" ON "nx01_rfq_item"("part_id");

ALTER TABLE "nx01_rfq_item" DROP CONSTRAINT IF EXISTS "nx01_rfq_item_rfq_id_fkey";
ALTER TABLE "nx01_rfq_item" ADD CONSTRAINT "nx01_rfq_item_rfq_id_fkey"
  FOREIGN KEY ("rfq_id") REFERENCES "nx01_rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nx01_rfq_item" DROP CONSTRAINT IF EXISTS "nx01_rfq_item_part_id_fkey";
ALTER TABLE "nx01_rfq_item" ADD CONSTRAINT "nx01_rfq_item_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_shortage" DROP CONSTRAINT IF EXISTS "nx02_shortage_ref_rfq_id_fkey";
ALTER TABLE "nx02_shortage" ADD CONSTRAINT "nx02_shortage_ref_rfq_id_fkey"
  FOREIGN KEY ("ref_rfq_id") REFERENCES "nx01_rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;
