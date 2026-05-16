-- packages/db-core/prisma/migrations/20260516160000_ar_impl_01_m2_brand_allocation_rule_create/migration.sql
-- ============================================================================
-- Migration: ar_impl_01_m2_brand_allocation_rule_create
-- 建立日期：2026-05-16
-- 任務：TASK-AR-IMPL-01 Phase 1 M2（AR 配比規則主檔新建）
-- 對應 plan：docs/auto-replenish/spec/impl/ar-impl-01-plan.md §3 M2
-- 對應 overview：docs/auto-replenish/spec/intent/ar-overview.md §5 配比規則設計
-- 對應拍板：
--   - Crown Q-AR-設計-1=a 新建 Nx03BrandAllocationRule 主檔
--   - Crown Q-B1=A modelId 級配比
--   - Crown Q-S1=A manual 覆寫 system（雙來源並存）
--   - Crown Q-M2=A Decimal(5,4) 精度
--
-- 範圍（A041 = 1 表 + 1 sequence + 1 gen_id + 2 FK + 1 unique + 1 index）：
--   1. sequence + gen_id function（NX03BALR0000001 格式）
--   2. CREATE TABLE nx03_brand_allocation_rule
--   3. 2 FK：tenant / model
--   4. unique [tenantId, modelId, valid_from]（同 model 同生效起期唯一、支援歷史版本）
--   5. index [tenantId, modelId]（model 反查常用）
--
-- 設計要點：
--   - id 範式：NX03BALR0000001（[NX03]+[4 chars BALR]+[7 digit]、對齊既有 NX03 表）
--   - modelId FK：Crown Q-B1=A 配比 modelId 級（同 model 配比一致）
--   - oemRatio + aftermarketRatio Decimal(5,4)：0.0000~1.0000、Σ 應 = 1.0（application 自律校驗）
--   - source VarChar(1) default 'S'：S=system / M=manual（Q-S1=A 雙來源並存）
--   - validFrom + validTo Date：支援歷史版本（validTo null=現役）
--   - unique [tenantId, modelId, validFrom]：同 model 同起期不可重複
--   - tenant/model FK ON DELETE RESTRICT（規則不可斷鏈）
--
-- 風險：低（純新表、無破壞、無 backfill）
-- ============================================================================

-- ============================================================================
-- 1. sequence + gen_id function
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx03_brand_allocation_rule_id START 1;

CREATE OR REPLACE FUNCTION gen_nx03_brand_allocation_rule_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03BALR' || LPAD(nextval('seq_nx03_brand_allocation_rule_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx03_brand_allocation_rule
-- ============================================================================

CREATE TABLE "nx03_brand_allocation_rule" (
    "id"                VARCHAR(15)   NOT NULL DEFAULT gen_nx03_brand_allocation_rule_id(),
    "tenant_id"         VARCHAR(15)   NOT NULL,
    "model_id"          VARCHAR(15)   NOT NULL,
    "oem_ratio"         DECIMAL(5, 4) NOT NULL DEFAULT 0.5,
    "aftermarket_ratio" DECIMAL(5, 4) NOT NULL DEFAULT 0.5,
    "source"            VARCHAR(1)    NOT NULL DEFAULT 'S',
    "valid_from"        DATE          NOT NULL,
    "valid_to"          DATE,
    "is_active"         BOOLEAN       NOT NULL DEFAULT true,
    "remark"            VARCHAR(200),
    "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"        VARCHAR(15)   NOT NULL,
    "updated_at"        TIMESTAMP(3)  NOT NULL,
    "updated_by"        VARCHAR(15)   NOT NULL,

    CONSTRAINT "nx03_brand_allocation_rule_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 3. indexes
-- ============================================================================

CREATE UNIQUE INDEX "nx03_brand_allocation_rule_tenant_model_valid_from_key"
  ON "nx03_brand_allocation_rule"("tenant_id", "model_id", "valid_from");

CREATE INDEX "nx03_brand_allocation_rule_tenant_model_idx"
  ON "nx03_brand_allocation_rule"("tenant_id", "model_id");

-- ============================================================================
-- 4. FKs
-- ============================================================================

ALTER TABLE "nx03_brand_allocation_rule"
  ADD CONSTRAINT "nx03_brand_allocation_rule_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_brand_allocation_rule"
  ADD CONSTRAINT "nx03_brand_allocation_rule_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "nx01_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 完成：BrandAllocationRule 主檔落地
-- 後續：Phase 2 brand-allocation-rule CRUD service + endpoint
-- ============================================================================
