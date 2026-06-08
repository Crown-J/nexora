-- packages/db-core/prisma/migrations/20260608050000_f1d_promotion/migration.sql
-- F1-D 銷貨優惠價子系統 2026-06-08：促銷規則 schema（Alex Q1/Q2/Q3/Q4 拍板）
--
-- 業務語意（Alex 拍板）：
--   ① 優惠價 = 商品/套餐層級指定絕對價（Q2）— price_override 純絕對價
--   ② 同商品多優惠取最低（Q4）— 引擎查多筆套用中、取 min(priceOverride)
--   ③ 優惠價低於成本→警示+必填理由（沿用 SoItem.belowMinReason 範式）、放行
--   ④ LITE 促銷範圍（Q1）：partId 多選 + brandId + partGroupId 三種（車型留汽車資料庫套件）
--   ⑤ 即期門檻全域設定（Q3）：tenant.shelf_life_warning_days、配合 part.shelfLifeMonths 用
--
-- 備份：dev-backups/pre-f1d-promotion_20260608_040000.sql（1.2MB）
-- 全 additive、3 新表 + 1 既有表加欄、三版本一致（LITE-CORE）。

-- ① ID generator sequences + functions
CREATE SEQUENCE IF NOT EXISTS seq_nx04_promotion_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_promotion_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04PRMO' || LPAD(nextval('seq_nx04_promotion_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx04_promotion_scope_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_promotion_scope_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04PRSC' || LPAD(nextval('seq_nx04_promotion_scope_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ② Nx04Promotion 表（促銷規則主檔）
CREATE TABLE "nx04_promotion" (
  "id"               VARCHAR(15)   PRIMARY KEY DEFAULT gen_nx04_promotion_id(),
  "tenant_id"        VARCHAR(15)   NOT NULL,
  "code"             VARCHAR(30)   NOT NULL,
  "name"             VARCHAR(100)  NOT NULL,
  -- 純絕對單價（Alex Q2 拍板、不存折扣率/折抵金額）
  "price_override"   DECIMAL(14,4) NOT NULL,
  "valid_from"       DATE          NOT NULL,
  "valid_to"         DATE          NOT NULL,
  -- 出清旗標（業務語意：報表分類 / UI 標示用）
  "is_clearance"     BOOLEAN       NOT NULL DEFAULT false,
  -- 批量買 N 件條件（買滿才套用、null=無限制）
  "min_buy_qty"      DECIMAL(14,4),
  "remark"           VARCHAR(200),
  "is_active"        BOOLEAN       NOT NULL DEFAULT true,
  "created_at"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"       VARCHAR(15)   NOT NULL,
  "updated_at"       TIMESTAMP(3)  NOT NULL,
  "updated_by"       VARCHAR(15)   NOT NULL,
  CONSTRAINT "nx04_promotion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "nx04_promotion_tenant_code_key" ON "nx04_promotion" ("tenant_id", "code");
CREATE INDEX "nx04_promotion_tenant_active_idx" ON "nx04_promotion" ("tenant_id", "is_active");
CREATE INDEX "nx04_promotion_tenant_valid_idx" ON "nx04_promotion" ("tenant_id", "valid_from", "valid_to");

-- ③ Nx04PromotionScope 表（範圍多對多、scopeType discriminator）
CREATE TABLE "nx04_promotion_scope" (
  "id"            VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx04_promotion_scope_id(),
  "tenant_id"     VARCHAR(15)  NOT NULL,
  "promotion_id"  VARCHAR(15)  NOT NULL,
  -- Alex Q1 拍板 3 種：P=part / B=brand / G=partGroup（車型歸汽車資料庫套件、不在 LITE）
  "scope_type"    VARCHAR(1)   NOT NULL,
  -- 依 scopeType 對應 partId / brandId / partGroupId（application 層 guard）
  "scope_id"      VARCHAR(15)  NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"    VARCHAR(15)  NOT NULL,
  CONSTRAINT "nx04_promotion_scope_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON UPDATE CASCADE,
  CONSTRAINT "nx04_promotion_scope_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "nx04_promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "nx04_promotion_scope_unique_key" ON "nx04_promotion_scope" ("tenant_id", "promotion_id", "scope_type", "scope_id");
CREATE INDEX "nx04_promotion_scope_lookup_idx" ON "nx04_promotion_scope" ("tenant_id", "scope_type", "scope_id");

-- ④ Nx99Tenant 加全域即期提醒門檻（Alex Q3 拍板）
ALTER TABLE "nx99_tenant"
  ADD COLUMN "shelf_life_warning_days" INTEGER NOT NULL DEFAULT 30;
