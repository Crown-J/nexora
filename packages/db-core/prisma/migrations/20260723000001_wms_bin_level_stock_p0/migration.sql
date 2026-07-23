-- packages/db-core/prisma/migrations/20260723000001_wms_bin_level_stock_p0/migration.sql
-- WMS 庫位級庫存 P0 地基（2026-07-23 執行長拍板、規格 docs/_team/bin-level-stock-proposal.md）：
--   · nx01_location 加 location_type（S 儲位／R 收貨暫存／K 待包暫存／B 待上架／U 未指定）。
--   · 新增 nx03_stock_location_balance（料件×倉庫×庫位 的 onHand）；倉庫餘額 nx03_stock_balance 不動。
-- 非破壞：location_type additive default 'S'；新表 additive。系統庫位建置＋餘額回填走 backfill 腳本（非本 SQL）。
-- ⚠️ 本機 migration 追蹤表壞（shadow DB）→ prisma db execute 手動套（沿用 0720~0723 範式）。

-- 1) nx01_location 加庫位類型（既有列一律 'S' 一般儲位）
ALTER TABLE "nx01_location" ADD COLUMN "location_type" VARCHAR(1) NOT NULL DEFAULT 'S';
COMMENT ON COLUMN "nx01_location"."location_type" IS '庫位類型（WMS 2026-07-23）：S=一般儲位／R=收貨暫存／K=待包暫存／B=待上架／U=未指定過渡格。系統格 R/K/B/U 流程靠類型找到、外觀可自訂類型鎖定、每倉每系統類型至少留一格啟用、非空不給停用刪。；啟用最低需求版本：LITE';

-- 2) 庫位級餘額 ID 產生器
CREATE SEQUENCE IF NOT EXISTS seq_nx03_stock_location_balance_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_stock_location_balance_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03SLLB' || LPAD(nextval('seq_nx03_stock_location_balance_id')::text, 7, '0');
$$ LANGUAGE sql;

-- 3) 庫位級餘額表
CREATE TABLE "nx03_stock_location_balance" (
  "id"            VARCHAR(15) NOT NULL DEFAULT gen_nx03_stock_location_balance_id(),
  "tenant_id"     VARCHAR(15) NOT NULL,
  "part_id"       VARCHAR(15) NOT NULL,
  "warehouse_id"  VARCHAR(15) NOT NULL,
  "location_id"   VARCHAR(15) NOT NULL,
  "on_hand_qty"   DECIMAL(14,4) NOT NULL DEFAULT 0,
  "last_move_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_active"     BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"    VARCHAR(15) NOT NULL,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "updated_by"    VARCHAR(15) NOT NULL,
  CONSTRAINT "nx03_stock_location_balance_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx03_stock_location_balance"
  ADD CONSTRAINT "nx03_stock_location_balance_tenant_id_fkey"    FOREIGN KEY ("tenant_id")    REFERENCES "nx99_tenant"("id")    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx03_stock_location_balance_part_id_fkey"      FOREIGN KEY ("part_id")      REFERENCES "nx01_part"("id")      ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx03_stock_location_balance_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx03_stock_location_balance_location_id_fkey"  FOREIGN KEY ("location_id")  REFERENCES "nx01_location"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "nx03_stock_location_balance_tenant_id_part_id_warehouse_id_lo_key"
  ON "nx03_stock_location_balance"("tenant_id", "part_id", "warehouse_id", "location_id");
CREATE INDEX "nx03_stock_location_balance_tenant_id_warehouse_id_location_i_idx"
  ON "nx03_stock_location_balance"("tenant_id", "warehouse_id", "location_id");
CREATE INDEX "nx03_stock_location_balance_tenant_id_part_id_idx"
  ON "nx03_stock_location_balance"("tenant_id", "part_id");

COMMENT ON TABLE "nx03_stock_location_balance" IS '庫位級庫存餘額（WMS 2026-07-23）：onHand 到庫位；可用量/保留量/成本維持倉庫級 nx03_stock_balance。恆等式 Σ庫位=倉庫。';
COMMENT ON COLUMN "nx03_stock_location_balance"."on_hand_qty" IS '這一格的現存量（實體幾個在這格）；啟用最低需求版本：LITE';
