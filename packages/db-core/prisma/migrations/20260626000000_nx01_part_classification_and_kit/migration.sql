-- 2026-06-26 Hank：零件主檔重構 Step 1（純加法）
-- 執行長拍板 NX01 零件調整，本步只做安全的加法：
--   1. 零件加 分類一(採購角度) / 分類二(技術角度) 兩個寫死 SmallInt 欄位（選填）
--   2. 車型加 engine_code / displacement_cc 自由輸入欄位（為後續取消引擎等外鍵鋪路）
--   3. 新建 組合/拆解組件關係表 nx01_part_kit + nx01_part_kit_item（含 gen_*_id 函式）
-- 不含任何 DROP（破壞性改動留後續步驟）。

-- 1. 零件分類欄位（分類一採購角度 / 分類二技術角度、皆選填）
ALTER TABLE "nx01_part"
  ADD COLUMN "purchase_category" SMALLINT,
  ADD COLUMN "tech_category"     SMALLINT;

-- 2. 車型引擎自由輸入欄位（取消引擎外鍵後改用）
ALTER TABLE "nx01_model"
  ADD COLUMN "engine_code"     VARCHAR(30),
  ADD COLUMN "displacement_cc" INTEGER;

-- 3. 組合/拆解組件關係表
-- 3a. ID generator（同範式 gen_nx01_xxx_id()）
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_part_kit_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_kit_id() RETURNS VARCHAR(15) AS $$
BEGIN
  RETURN 'NX01PKIT' || LPAD(nextval('seq_nx01_part_kit_id')::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS "seq_nx01_part_kit_item_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_kit_item_id() RETURNS VARCHAR(15) AS $$
BEGIN
  RETURN 'NX01PKII' || LPAD(nextval('seq_nx01_part_kit_item_id')::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- 3b. 表頭：整體件 = 一組組件（含數量）
CREATE TABLE "nx01_part_kit" (
  "id"            VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_kit_id(),
  "tenant_id"     VARCHAR(15) NOT NULL,
  "whole_part_id" VARCHAR(15) NOT NULL,
  "name"          VARCHAR(100) NOT NULL,
  "remark"        VARCHAR(200),
  "sort_no"       INTEGER NOT NULL DEFAULT 0,
  "is_active"     BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"    VARCHAR(15) NOT NULL,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "updated_by"    VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_part_kit_pkey" PRIMARY KEY ("id")
);

-- 3c. 明細：組件料號 + 數量
CREATE TABLE "nx01_part_kit_item" (
  "id"         VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_kit_item_id(),
  "tenant_id"  VARCHAR(15) NOT NULL,
  "kit_id"     VARCHAR(15) NOT NULL,
  "part_id"    VARCHAR(15) NOT NULL,
  "qty"        DECIMAL(14,4) NOT NULL,
  "sort_no"    INTEGER NOT NULL DEFAULT 0,
  "remark"     VARCHAR(200),
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" VARCHAR(15) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by" VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_part_kit_item_pkey" PRIMARY KEY ("id")
);

-- 3d. Index
CREATE INDEX "nx01_part_kit_tenant_id_whole_part_id_idx" ON "nx01_part_kit"("tenant_id", "whole_part_id");
CREATE INDEX "nx01_part_kit_item_tenant_id_kit_id_idx" ON "nx01_part_kit_item"("tenant_id", "kit_id");
CREATE INDEX "nx01_part_kit_item_tenant_id_part_id_idx" ON "nx01_part_kit_item"("tenant_id", "part_id");
CREATE UNIQUE INDEX "nx01_part_kit_item_tenant_id_kit_id_part_id_key" ON "nx01_part_kit_item"("tenant_id", "kit_id", "part_id");

-- 3e. Foreign key（ON DELETE RESTRICT 對齊 Prisma 預設、kit_id 走 CASCADE）
ALTER TABLE "nx01_part_kit"
  ADD CONSTRAINT "nx01_part_kit_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx01_part_kit_whole_part_id_fkey"
    FOREIGN KEY ("whole_part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_part_kit_item"
  ADD CONSTRAINT "nx01_part_kit_item_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx01_part_kit_item_kit_id_fkey"
    FOREIGN KEY ("kit_id") REFERENCES "nx01_part_kit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "nx01_part_kit_item_part_id_fkey"
    FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
