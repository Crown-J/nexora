-- 2026-06-28 Hank：庫位接上貨架層（五層 據點→倉庫→區域→貨架→庫位 收尾）
--   nx01_location 加 rack_id FK（nullable 過渡、舊 rack VARCHAR 字串欄保留相容）
--   Backfill：每區域預建一筆 R00 主架、現有 location 依其 zone_id 全部指向該預設 rack
--   （鏡像 2026-06-22 zone 層 Z00 主區的遷移範式）

-- 1. 加欄位 + FK
ALTER TABLE "nx01_location"
  ADD COLUMN IF NOT EXISTS "rack_id" VARCHAR(15);

ALTER TABLE "nx01_location"
  ADD CONSTRAINT "nx01_location_rack_id_fkey"
    FOREIGN KEY ("rack_id") REFERENCES "nx01_warehouse_rack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Backfill：每區域預建 R00 主架（created/updated by = SYSADMIN_USER_ID）
--    再把該區域所有 location.rack_id 指到該 default rack（資料保留、不破壞既有 stock 對應）
DO $$
DECLARE
  z RECORD;
  v_rack_id VARCHAR(15);
BEGIN
  FOR z IN SELECT id, tenant_id FROM nx01_warehouse_zone LOOP
    INSERT INTO nx01_warehouse_rack (
      tenant_id, zone_id, code, name, sort_no, is_active,
      created_by, updated_at, updated_by
    ) VALUES (
      z.tenant_id, z.id, 'R00', '主架', 0, true,
      'NX01USER0000001', NOW(), 'NX01USER0000001'
    )
    ON CONFLICT (tenant_id, zone_id, code) DO NOTHING
    RETURNING id INTO v_rack_id;

    -- 若 ON CONFLICT 略過、取已存在的 default rack id
    IF v_rack_id IS NULL THEN
      SELECT id INTO v_rack_id FROM nx01_warehouse_rack
        WHERE tenant_id = z.tenant_id AND zone_id = z.id AND code = 'R00';
    END IF;

    -- 把該區域所有 location.rack_id 指到 default rack
    UPDATE nx01_location
       SET rack_id = v_rack_id
     WHERE zone_id = z.id AND rack_id IS NULL;
  END LOOP;
END $$;
