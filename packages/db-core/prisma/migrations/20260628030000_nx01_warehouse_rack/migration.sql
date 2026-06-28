-- 2026-06-28 Hank：五層倉儲第四層「貨架」（執行長指示補 區域/貨架 兩主檔）
--   據點→倉庫→區域→[貨架]→庫位；貨架掛在區域底下（zone_id FK）
--   新表、空資料、不動 nx01_location（rack 與 location 連結待後續需求再補 rack_id）

-- 1. 序列 + ID generator（同範式 gen_nx01_xxx_id()）
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_warehouse_rack_id" START 1;

CREATE OR REPLACE FUNCTION gen_nx01_warehouse_rack_id() RETURNS VARCHAR(15) AS $$
BEGIN
  RETURN 'NX01WHRK' || LPAD(nextval('seq_nx01_warehouse_rack_id')::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. 新表
CREATE TABLE IF NOT EXISTS "nx01_warehouse_rack" (
  "id"          VARCHAR(15) NOT NULL DEFAULT gen_nx01_warehouse_rack_id(),
  "tenant_id"   VARCHAR(15) NOT NULL,
  "zone_id"     VARCHAR(15) NOT NULL,
  "code"        VARCHAR(20) NOT NULL,
  "name"        VARCHAR(50) NOT NULL,
  "sort_no"     INTEGER NOT NULL DEFAULT 0,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"  VARCHAR(15) NOT NULL,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "updated_by"  VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_warehouse_rack_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx01_warehouse_rack"
  ADD CONSTRAINT "nx01_warehouse_rack_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT "nx01_warehouse_rack_zone_id_fkey"
    FOREIGN KEY ("zone_id") REFERENCES "nx01_warehouse_zone"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE UNIQUE INDEX "nx01_warehouse_rack_tenant_id_zone_id_code_key"
  ON "nx01_warehouse_rack"("tenant_id", "zone_id", "code");

CREATE INDEX "nx01_warehouse_rack_tenant_zone_idx"
  ON "nx01_warehouse_rack"("tenant_id", "zone_id");
