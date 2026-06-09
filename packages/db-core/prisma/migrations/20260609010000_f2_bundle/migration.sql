-- packages/db-core/prisma/migrations/20260609010000_f2_bundle/migration.sql
-- F2 組合套餐 2026-06-09：Bundle schema（Alex 收尾 Phase 2）
--
-- 業務語意（Alex 拍板）：
--   ① Bundle = 套餐名稱 / 套餐總價 / 時段 / 啟停
--   ② BundleItem = 套餐組成料件 + 數量
--   ③ SO 帶套餐 → 各組成料件逐項出庫扣庫存、各 line 帶 bundleId
--   ④ 整組單價 = 套餐價（按 priceA × qty 比例分攤到各 line）
--   ⚠️ 選了套餐、組內料件「不再各自跑促銷引擎」（套餐價就是整組最終價、避免重複折）
--      → 引擎在 SoService.assertSoLinePriceReason 偵測 line.bundleId 非空時 skip
--
-- 備份：dev-backups/pre-f2-bundle_20260609_000000.sql（1.25MB）
-- 全 additive、2 新表 + 1 既有表加欄、三版本一致（LITE-CORE）。

-- ① ID generator sequences + functions
CREATE SEQUENCE IF NOT EXISTS seq_nx04_bundle_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_bundle_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04BNDL' || LPAD(nextval('seq_nx04_bundle_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx04_bundle_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_bundle_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04BDIT' || LPAD(nextval('seq_nx04_bundle_item_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ② Nx04Bundle 表（套餐主檔）
CREATE TABLE "nx04_bundle" (
  "id"             VARCHAR(15)   PRIMARY KEY DEFAULT gen_nx04_bundle_id(),
  "tenant_id"      VARCHAR(15)   NOT NULL,
  "code"           VARCHAR(30)   NOT NULL,
  "name"           VARCHAR(100)  NOT NULL,
  -- 套餐整組總價（業務員設、SO 套用時按比例分攤到各 line）
  "bundle_price"   DECIMAL(14,2) NOT NULL,
  "valid_from"     DATE          NOT NULL,
  "valid_to"       DATE          NOT NULL,
  "is_active"      BOOLEAN       NOT NULL DEFAULT true,
  "remark"         VARCHAR(200),
  "created_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"     VARCHAR(15)   NOT NULL,
  "updated_at"     TIMESTAMP(3)  NOT NULL,
  "updated_by"     VARCHAR(15)   NOT NULL,
  CONSTRAINT "nx04_bundle_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "nx04_bundle_tenant_code_key" ON "nx04_bundle" ("tenant_id", "code");
CREATE INDEX "nx04_bundle_tenant_active_idx" ON "nx04_bundle" ("tenant_id", "is_active");
CREATE INDEX "nx04_bundle_tenant_valid_idx" ON "nx04_bundle" ("tenant_id", "valid_from", "valid_to");

-- ③ Nx04BundleItem 表（套餐組成）
CREATE TABLE "nx04_bundle_item" (
  "id"          VARCHAR(15)   PRIMARY KEY DEFAULT gen_nx04_bundle_item_id(),
  "tenant_id"   VARCHAR(15)   NOT NULL,
  "bundle_id"   VARCHAR(15)   NOT NULL,
  "part_id"     VARCHAR(15)   NOT NULL,
  "qty"         DECIMAL(14,4) NOT NULL,
  "created_at"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"  VARCHAR(15)   NOT NULL,
  CONSTRAINT "nx04_bundle_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON UPDATE CASCADE,
  CONSTRAINT "nx04_bundle_item_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "nx04_bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "nx04_bundle_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "nx04_bundle_item_bundle_part_key" ON "nx04_bundle_item" ("bundle_id", "part_id");
CREATE INDEX "nx04_bundle_item_tenant_part_idx" ON "nx04_bundle_item" ("tenant_id", "part_id");

-- ④ Nx04SoItem 加 bundle_id（SO line 標記屬於哪個套餐、引擎遇到 bundleId 非空跳過促銷套用）
ALTER TABLE "nx04_so_item"
  ADD COLUMN "bundle_id" VARCHAR(15);

CREATE INDEX "nx04_so_item_bundle_id_idx" ON "nx04_so_item" ("bundle_id");
