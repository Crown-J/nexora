-- 2026-06-22 Hank：倉庫分區層（執行長拍板新增四層架構 site→warehouse→zone→location）
--
-- 1. ID generator function（同範式 gen_nx01_xxx_id()）
-- 2. 新建 nx01_warehouse_zone 表
-- 3. nx01_location 加 zone_id 欄位（nullable 過渡、舊 zone VARCHAR 欄位保留相容）
-- 4. Backfill：每倉預建一筆 Z00 主區、現有 location.zone_id 全部指向該預設 zone

-- 1. 序列 + ID generator
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_warehouse_zone_id" START 1;

CREATE OR REPLACE FUNCTION gen_nx01_warehouse_zone_id() RETURNS VARCHAR(15) AS $$
BEGIN
  RETURN 'NX01WHZN' || LPAD(nextval('seq_nx01_warehouse_zone_id')::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. 新表
CREATE TABLE IF NOT EXISTS "nx01_warehouse_zone" (
  "id"          VARCHAR(15) NOT NULL DEFAULT gen_nx01_warehouse_zone_id(),
  "tenant_id"   VARCHAR(15) NOT NULL,
  "warehouse_id" VARCHAR(15) NOT NULL,
  "code"        VARCHAR(20) NOT NULL,
  "name"        VARCHAR(50) NOT NULL,
  "sort_no"     INTEGER NOT NULL DEFAULT 0,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"  VARCHAR(15) NOT NULL,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "updated_by"  VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_warehouse_zone_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx01_warehouse_zone"
  ADD CONSTRAINT "nx01_warehouse_zone_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT "nx01_warehouse_zone_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE UNIQUE INDEX "nx01_warehouse_zone_tenant_id_warehouse_id_code_key"
  ON "nx01_warehouse_zone"("tenant_id", "warehouse_id", "code");

CREATE INDEX "nx01_warehouse_zone_tenant_warehouse_idx"
  ON "nx01_warehouse_zone"("tenant_id", "warehouse_id");

-- 3. nx01_location 加 zone_id 欄位
ALTER TABLE "nx01_location"
  ADD COLUMN "zone_id" VARCHAR(15);

ALTER TABLE "nx01_location"
  ADD CONSTRAINT "nx01_location_zone_id_fkey"
    FOREIGN KEY ("zone_id") REFERENCES "nx01_warehouse_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Backfill：每倉預建 Z00 主區（用 SYSADMIN_USER_ID 當 created/updated by）
--    對齊現有資料：每倉所有 location 都指到該 default zone（資料保留、不破壞既有 stock 對應）
DO $$
DECLARE
  r RECORD;
  v_zone_id VARCHAR(15);
BEGIN
  FOR r IN SELECT id, tenant_id FROM nx01_warehouse LOOP
    INSERT INTO nx01_warehouse_zone (
      tenant_id, warehouse_id, code, name, sort_no, is_active,
      created_by, updated_at, updated_by
    ) VALUES (
      r.tenant_id, r.id, 'Z00', '主區', 0, true,
      'NX01USER0000001', NOW(), 'NX01USER0000001'
    )
    ON CONFLICT (tenant_id, warehouse_id, code) DO NOTHING
    RETURNING id INTO v_zone_id;

    -- 若上面 ON CONFLICT 略過、取已存在的 default zone id
    IF v_zone_id IS NULL THEN
      SELECT id INTO v_zone_id FROM nx01_warehouse_zone
        WHERE tenant_id = r.tenant_id AND warehouse_id = r.id AND code = 'Z00';
    END IF;

    -- 把該倉所有 location.zone_id 指到 default zone
    UPDATE nx01_location
       SET zone_id = v_zone_id
     WHERE warehouse_id = r.id AND zone_id IS NULL;
  END LOOP;
END $$;
