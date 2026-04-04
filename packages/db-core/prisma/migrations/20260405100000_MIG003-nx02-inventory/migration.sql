-- MIG003 | NX02 庫存模組
-- 說明：庫存台帳、餘額彙總、庫存設定、盤點單／明細；PLUS：缺貨簿、自動補貨規則、調撥單／明細。
-- 依賴：MIG001、MIG002（nx00 主檔、nx99 租戶）
-- 欄位對齊 docs/nx02_field.csv；盤點明細 counted_qty 允許 NULL（SRS-03：未填入＝未盤點）。
-- 缺貨簿 ref_rfq_id 暫無 FK（待 NX01 nx01_rfq 併入後再加）。
-- 唯一鍵：同租戶同料號同倉庫僅一筆 OPEN 缺貨（partial unique index）。

-- ---------------------------------------------------------------------------
-- ID 產生函式（前綴 NX02，7 碼流水）
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_nx02_stle_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_stle_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02STLE' || LPAD(nextval('seq_nx02_stle_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_stbl_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_stbl_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02STBL' || LPAD(nextval('seq_nx02_stbl_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_psst_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_psst_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02PSST' || LPAD(nextval('seq_nx02_psst_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_shor_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_shor_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02SHOR' || LPAD(nextval('seq_nx02_shor_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_aure_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_aure_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02AURE' || LPAD(nextval('seq_nx02_aure_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_sttk_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_sttk_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02STTK' || LPAD(nextval('seq_nx02_sttk_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_stti_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_stti_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02STTI' || LPAD(nextval('seq_nx02_stti_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_sthd_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_sthd_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02STHD' || LPAD(nextval('seq_nx02_sthd_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_stit_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_stit_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02STIT' || LPAD(nextval('seq_nx02_stit_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ---------------------------------------------------------------------------
-- nx02_stock_ledger
-- ---------------------------------------------------------------------------
CREATE TABLE "nx02_stock_ledger" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_stle_id(),
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

    CONSTRAINT "nx02_stock_ledger_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- nx02_stock_balance
-- ---------------------------------------------------------------------------
CREATE TABLE "nx02_stock_balance" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_stbl_id(),
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
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx02_stock_balance_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- nx02_part_stock_setting
-- ---------------------------------------------------------------------------
CREATE TABLE "nx02_part_stock_setting" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_psst_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "min_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "max_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reorder_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx02_part_stock_setting_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- nx02_shortage（PLUS）
-- ---------------------------------------------------------------------------
CREATE TABLE "nx02_shortage" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_shor_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "on_hand_qty" DECIMAL(14,4) NOT NULL,
    "min_qty" DECIMAL(14,4) NOT NULL,
    "shortage_qty" DECIMAL(14,4) NOT NULL,
    "suggest_order_qty" DECIMAL(14,4) NOT NULL,
    "status" VARCHAR(1) NOT NULL,
    "ref_rfq_id" VARCHAR(15),
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx02_shortage_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- nx02_auto_replenish（PLUS）
-- ---------------------------------------------------------------------------
CREATE TABLE "nx02_auto_replenish" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_aure_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "from_warehouse_id" VARCHAR(15) NOT NULL,
    "to_warehouse_id" VARCHAR(15) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx02_auto_replenish_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- nx02_stock_take
-- ---------------------------------------------------------------------------
CREATE TABLE "nx02_stock_take" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_sttk_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "stock_take_date" DATE NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "scope_type" VARCHAR(1) NOT NULL,
    "status" VARCHAR(1) NOT NULL,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),

    CONSTRAINT "nx02_stock_take_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- nx02_stock_take_item
-- ---------------------------------------------------------------------------
CREATE TABLE "nx02_stock_take_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_stti_id(),
    "stock_take_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "part_no" VARCHAR(50) NOT NULL,
    "part_name" VARCHAR(200) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "location_id" VARCHAR(15) NOT NULL,
    "system_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "counted_qty" DECIMAL(14,4),
    "diff_qty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "diff_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adjust_type" VARCHAR(1) NOT NULL DEFAULT 'N',
    "status" VARCHAR(1) NOT NULL DEFAULT 'O',
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx02_stock_take_item_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- nx02_st（調撥單表頭，PLUS）
-- ---------------------------------------------------------------------------
CREATE TABLE "nx02_st" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_sthd_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(16) NOT NULL,
    "st_date" DATE NOT NULL,
    "from_warehouse_id" VARCHAR(15) NOT NULL,
    "to_warehouse_id" VARCHAR(15) NOT NULL,
    "status" VARCHAR(1) NOT NULL,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "voided_at" TIMESTAMP(3),
    "voided_by" VARCHAR(15),

    CONSTRAINT "nx02_st_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- nx02_st_item
-- ---------------------------------------------------------------------------
CREATE TABLE "nx02_st_item" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_stit_id(),
    "st_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL,
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
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx02_st_item_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Unique indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "nx02_stock_balance_tenant_id_part_id_warehouse_id_key" ON "nx02_stock_balance"("tenant_id", "part_id", "warehouse_id");
CREATE UNIQUE INDEX "nx02_part_stock_setting_tenant_id_part_id_warehouse_id_key" ON "nx02_part_stock_setting"("tenant_id", "part_id", "warehouse_id");
CREATE UNIQUE INDEX "nx02_auto_replenish_tenant_id_from_warehouse_id_to_warehouse_id_key" ON "nx02_auto_replenish"("tenant_id", "from_warehouse_id", "to_warehouse_id");
CREATE UNIQUE INDEX "nx02_stock_take_tenant_id_doc_no_key" ON "nx02_stock_take"("tenant_id", "doc_no");
CREATE UNIQUE INDEX "nx02_stock_take_item_stock_take_id_line_no_key" ON "nx02_stock_take_item"("stock_take_id", "line_no");
CREATE UNIQUE INDEX "nx02_st_tenant_id_doc_no_key" ON "nx02_st"("tenant_id", "doc_no");
CREATE UNIQUE INDEX "nx02_st_item_st_id_line_no_key" ON "nx02_st_item"("st_id", "line_no");

-- 同租戶＋料號＋倉庫同時僅一筆 OPEN 缺貨（SRS-03 §2.4）
CREATE UNIQUE INDEX "nx02_shortage_open_per_part_wh_idx" ON "nx02_shortage" ("tenant_id", "part_id", "warehouse_id") WHERE "status" = 'O';

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "nx02_stock_ledger" ADD CONSTRAINT "nx02_stock_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_ledger" ADD CONSTRAINT "nx02_stock_ledger_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_ledger" ADD CONSTRAINT "nx02_stock_ledger_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_ledger" ADD CONSTRAINT "nx02_stock_ledger_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_stock_balance" ADD CONSTRAINT "nx02_stock_balance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_balance" ADD CONSTRAINT "nx02_stock_balance_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_balance" ADD CONSTRAINT "nx02_stock_balance_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_balance" ADD CONSTRAINT "nx02_stock_balance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_balance" ADD CONSTRAINT "nx02_stock_balance_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx02_part_stock_setting" ADD CONSTRAINT "nx02_part_stock_setting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_part_stock_setting" ADD CONSTRAINT "nx02_part_stock_setting_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_part_stock_setting" ADD CONSTRAINT "nx02_part_stock_setting_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_part_stock_setting" ADD CONSTRAINT "nx02_part_stock_setting_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_part_stock_setting" ADD CONSTRAINT "nx02_part_stock_setting_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx02_shortage" ADD CONSTRAINT "nx02_shortage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_shortage" ADD CONSTRAINT "nx02_shortage_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_shortage" ADD CONSTRAINT "nx02_shortage_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_shortage" ADD CONSTRAINT "nx02_shortage_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_shortage" ADD CONSTRAINT "nx02_shortage_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx02_auto_replenish" ADD CONSTRAINT "nx02_auto_replenish_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_auto_replenish" ADD CONSTRAINT "nx02_auto_replenish_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_auto_replenish" ADD CONSTRAINT "nx02_auto_replenish_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_auto_replenish" ADD CONSTRAINT "nx02_auto_replenish_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_auto_replenish" ADD CONSTRAINT "nx02_auto_replenish_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx02_stock_take" ADD CONSTRAINT "nx02_stock_take_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take" ADD CONSTRAINT "nx02_stock_take_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take" ADD CONSTRAINT "nx02_stock_take_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take" ADD CONSTRAINT "nx02_stock_take_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take" ADD CONSTRAINT "nx02_stock_take_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take" ADD CONSTRAINT "nx02_stock_take_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_stock_take_id_fkey" FOREIGN KEY ("stock_take_id") REFERENCES "nx02_stock_take"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_stock_take_item" ADD CONSTRAINT "nx02_stock_take_item_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx02_st" ADD CONSTRAINT "nx02_st_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_st" ADD CONSTRAINT "nx02_st_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_st" ADD CONSTRAINT "nx02_st_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_st" ADD CONSTRAINT "nx02_st_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_st" ADD CONSTRAINT "nx02_st_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_st" ADD CONSTRAINT "nx02_st_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_st" ADD CONSTRAINT "nx02_st_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx02_st_item" ADD CONSTRAINT "nx02_st_item_st_id_fkey" FOREIGN KEY ("st_id") REFERENCES "nx02_st"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx02_st_item" ADD CONSTRAINT "nx02_st_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_st_item" ADD CONSTRAINT "nx02_st_item_part_brand_id_fkey" FOREIGN KEY ("part_brand_id") REFERENCES "nx00_part_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_st_item" ADD CONSTRAINT "nx02_st_item_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "nx00_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_st_item" ADD CONSTRAINT "nx02_st_item_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "nx00_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_st_item" ADD CONSTRAINT "nx02_st_item_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_st_item" ADD CONSTRAINT "nx02_st_item_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Query indexes
-- ---------------------------------------------------------------------------
CREATE INDEX "nx02_stock_ledger_tenant_id_idx" ON "nx02_stock_ledger"("tenant_id");
CREATE INDEX "nx02_stock_ledger_movement_date_idx" ON "nx02_stock_ledger"("movement_date");
CREATE INDEX "nx02_stock_ledger_warehouse_id_idx" ON "nx02_stock_ledger"("warehouse_id");
CREATE INDEX "nx02_stock_ledger_part_id_idx" ON "nx02_stock_ledger"("part_id");

CREATE INDEX "nx02_stock_balance_tenant_id_idx" ON "nx02_stock_balance"("tenant_id");
CREATE INDEX "nx02_stock_balance_warehouse_id_idx" ON "nx02_stock_balance"("warehouse_id");

CREATE INDEX "nx02_part_stock_setting_tenant_id_idx" ON "nx02_part_stock_setting"("tenant_id");
CREATE INDEX "nx02_part_stock_setting_warehouse_id_idx" ON "nx02_part_stock_setting"("warehouse_id");

CREATE INDEX "nx02_shortage_tenant_id_idx" ON "nx02_shortage"("tenant_id");
CREATE INDEX "nx02_shortage_warehouse_id_idx" ON "nx02_shortage"("warehouse_id");
CREATE INDEX "nx02_shortage_status_idx" ON "nx02_shortage"("status");

CREATE INDEX "nx02_auto_replenish_tenant_id_idx" ON "nx02_auto_replenish"("tenant_id");

CREATE INDEX "nx02_stock_take_tenant_id_idx" ON "nx02_stock_take"("tenant_id");
CREATE INDEX "nx02_stock_take_warehouse_id_idx" ON "nx02_stock_take"("warehouse_id");
CREATE INDEX "nx02_stock_take_status_idx" ON "nx02_stock_take"("status");

CREATE INDEX "nx02_stock_take_item_stock_take_id_idx" ON "nx02_stock_take_item"("stock_take_id");
CREATE INDEX "nx02_stock_take_item_part_id_idx" ON "nx02_stock_take_item"("part_id");

CREATE INDEX "nx02_st_tenant_id_idx" ON "nx02_st"("tenant_id");
CREATE INDEX "nx02_st_from_warehouse_id_idx" ON "nx02_st"("from_warehouse_id");
CREATE INDEX "nx02_st_to_warehouse_id_idx" ON "nx02_st"("to_warehouse_id");
CREATE INDEX "nx02_st_status_idx" ON "nx02_st"("status");

CREATE INDEX "nx02_st_item_st_id_idx" ON "nx02_st_item"("st_id");
CREATE INDEX "nx02_st_item_part_id_idx" ON "nx02_st_item"("part_id");
