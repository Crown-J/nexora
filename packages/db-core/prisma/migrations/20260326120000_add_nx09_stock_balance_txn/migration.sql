-- NX09 ID sequences & generator functions
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

-- CreateTable
CREATE TABLE "nx09_stock_balance" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx09_stock_balance_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx09_stock_balance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex（unique composite）
CREATE UNIQUE INDEX "nx09_stock_balance_tenant_id_warehouse_id_part_id_key"
  ON "nx09_stock_balance"("tenant_id", "warehouse_id", "part_id");

-- AddForeignKey
ALTER TABLE "nx09_stock_balance"
  ADD CONSTRAINT "nx09_stock_balance_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_stock_balance"
  ADD CONSTRAINT "nx09_stock_balance_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_stock_balance"
  ADD CONSTRAINT "nx09_stock_balance_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "nx09_stock_balance_warehouse_id_idx" ON "nx09_stock_balance"("warehouse_id");

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

-- AddForeignKey
ALTER TABLE "nx09_stock_txn"
  ADD CONSTRAINT "nx09_stock_txn_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_stock_txn"
  ADD CONSTRAINT "nx09_stock_txn_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx09_stock_txn"
  ADD CONSTRAINT "nx09_stock_txn_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "nx09_stock_txn_occurred_at_idx" ON "nx09_stock_txn"("occurred_at");

-- CreateIndex
CREATE INDEX "nx09_stock_txn_warehouse_id_idx" ON "nx09_stock_txn"("warehouse_id");

-- CreateIndex
CREATE INDEX "nx09_stock_txn_part_id_idx" ON "nx09_stock_txn"("part_id");

