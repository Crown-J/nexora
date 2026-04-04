-- MIG003b：NX02 開帳存表頭與明細
-- 補充 MIG003-nx02-inventory，新增 nx02_init / nx02_init_item
-- FK 行為對齊 MIG003（業務鍵 RESTRICT；明細隨表頭 CASCADE；使用者 nullable SET NULL）

-- Sequence 與 ID function：nx02_init 表頭
CREATE SEQUENCE IF NOT EXISTS nx02_inhd_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx02_inhd_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'NX00INHD' || LPAD(nextval('nx02_inhd_seq')::TEXT, 7, '0');
END;
$$;

-- Sequence 與 ID function：nx02_init_item 明細
CREATE SEQUENCE IF NOT EXISTS nx02_init_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx02_init_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'NX00INIT' || LPAD(nextval('nx02_init_seq')::TEXT, 7, '0');
END;
$$;

-- 開帳存表頭
CREATE TABLE "nx02_init" (
  "id"           VARCHAR(15)   NOT NULL DEFAULT gen_nx02_inhd_id(),
  "tenant_id"    VARCHAR(15)   NOT NULL,
  "doc_no"       VARCHAR(16)   NOT NULL,
  "init_date"    DATE          NOT NULL DEFAULT CURRENT_DATE,
  "warehouse_id" VARCHAR(15)   NOT NULL,
  "status"       VARCHAR(1)    NOT NULL DEFAULT 'D',
  "remark"       VARCHAR(200),
  "created_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"   VARCHAR(15),
  "updated_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"   VARCHAR(15),
  "posted_at"    TIMESTAMP(3),
  "posted_by"    VARCHAR(15),
  "voided_at"    TIMESTAMP(3),
  "voided_by"    VARCHAR(15),

  CONSTRAINT "nx02_init_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx02_init_tenant_id_doc_no_key" ON "nx02_init"("tenant_id", "doc_no");

ALTER TABLE "nx02_init" ADD CONSTRAINT "nx02_init_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_init" ADD CONSTRAINT "nx02_init_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_init" ADD CONSTRAINT "nx02_init_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_init" ADD CONSTRAINT "nx02_init_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_init" ADD CONSTRAINT "nx02_init_posted_by_fkey"
  FOREIGN KEY ("posted_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_init" ADD CONSTRAINT "nx02_init_voided_by_fkey"
  FOREIGN KEY ("voided_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "nx02_init_tenant_id_idx" ON "nx02_init"("tenant_id");
CREATE INDEX "nx02_init_warehouse_id_idx" ON "nx02_init"("warehouse_id");
CREATE INDEX "nx02_init_status_idx" ON "nx02_init"("status");

-- 開帳存明細
CREATE TABLE "nx02_init_item" (
  "id"          VARCHAR(15)    NOT NULL DEFAULT gen_nx02_init_id(),
  "init_id"     VARCHAR(15)    NOT NULL,
  "line_no"     INTEGER        NOT NULL,
  "part_id"     VARCHAR(15)    NOT NULL,
  "part_no"     VARCHAR(50)    NOT NULL,
  "part_name"   VARCHAR(200)   NOT NULL,
  "location_id" VARCHAR(15),
  "qty"         DECIMAL(14,4)  NOT NULL DEFAULT 0,
  "unit_cost"   DECIMAL(14,4)  NOT NULL DEFAULT 0,
  "total_cost"  DECIMAL(14,2)  NOT NULL,
  "remark"      VARCHAR(200),
  "created_at"  TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"  VARCHAR(15),
  "updated_at"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"  VARCHAR(15),

  CONSTRAINT "nx02_init_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx02_init_item_init_id_line_no_key" ON "nx02_init_item"("init_id", "line_no");

ALTER TABLE "nx02_init_item" ADD CONSTRAINT "nx02_init_item_init_id_fkey"
  FOREIGN KEY ("init_id") REFERENCES "nx02_init"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx02_init_item" ADD CONSTRAINT "nx02_init_item_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_init_item" ADD CONSTRAINT "nx02_init_item_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "nx00_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_init_item" ADD CONSTRAINT "nx02_init_item_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_init_item" ADD CONSTRAINT "nx02_init_item_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "nx02_init_item_init_id_idx" ON "nx02_init_item"("init_id");
CREATE INDEX "nx02_init_item_part_id_idx" ON "nx02_init_item"("part_id");
