-- packages/db-core/prisma/migrations/20260517130000_nx02_impl_01_m4_partner_part_create/migration.sql
-- ============================================================================
-- Migration: nx02_impl_01_m4_partner_part_create
-- 建立日期：2026-05-17
-- 任務：TASK-NX02-IMPL-01 Phase 1 M4（partner ↔ part 中間表主檔新建）
-- 對應 plan：docs/nx02/spec/impl/nx02-impl-01-plan.md §3 M4
-- 對應 overview：docs/nx02/spec/intent/nx02-overview.md §4 + §8.1 #11
-- 對應 audit：docs/nx02/nx02-audit-02.md 後記 path C 混合範式（推薦）
-- 對應拍板：
--   - Crown Q-PP-1=C 混合範式（主檔 + 歷史推算 fallback）
--   - Crown Q-PP-2=a 不細分 partnerType=S（application 層 guard）
--   - Crown Q-PP-3=b 廠商料號選填（supplierPartNo nullable）
--   - Crown Q-S3=A unique [tenantId, partnerId, partId, validFrom]（支援歷史版本、仿 AR BrandAllocationRule）
--
-- 範圍（A041 = 1 sequence + 1 function + 1 table + 1 unique + 3 index + 3 FK）：
--   1. sequence + gen_id function（NX02PNPT0000001 格式、對齊既有 NX02 表）
--   2. CREATE TABLE nx02_partner_part
--   3. unique [tenantId, partnerId, partId, validFrom]（同對同生效起期唯一、支援歷史版本）
--   4. 3 index：[tenantId, partnerId] / [tenantId, partId] / [tenantId, isPrimary]
--   5. 3 FK：tenant / partner / part（全 ON DELETE RESTRICT 不可斷鏈）
--
-- 設計要點（對齊 audit-02 後記 path C）：
--   - id 範式：NX02PNPT0000001（[NX02]+[4 chars PNPT=PartNerParT]+[7 digit]、對齊既有 NX02 範式）
--   - partnerId FK：application 層 guard partner_type='S'（Crown Q-PP-2=a 不在 DB 強制）
--   - isPrimary Boolean default false：主要供應商標記（採購建議單列表優先排序）
--   - supplierPartNo VarChar(50) nullable：廠商料號（Q-PP-3=b 選填、業界 muscle memory 雙料號對應）
--   - defaultUnitCost / defaultLeadDays / moq：採購建議單預設值（無歷史時 fallback）
--   - source VarChar(1) default 'S'：S=system / M=manual（仿 AR BrandAllocationRule Q-S1=A 雙來源並存）
--   - validFrom / validTo Date nullable：支援歷史版本（validTo null=現役）
--   - unique [tenantId, partnerId, partId, validFrom]：同對同起期不可重複（仿 AR BrandAllocationRule [tenantId, modelId, validFrom]）
--   - tenant/partner/part FK ON DELETE RESTRICT（主檔不可斷鏈）
--
-- 業務語意：
--   - 主檔層 explicit 定義「A 廠商供應料件 X / Y / Z」（業界戰略合作 / 長期合約）
--   - 採購建議單列表按廠商篩時：先查主檔 → 找不到 fallback 歷史推算（PurchaseSuggestionService）
--   - source 雙來源支援 nightly job 自動同步（系統建議 S）+ 業務手動覆寫（M）
--   - 對齊 NEXORA 業界改革候選 ⭐⭐「partner ↔ part 混合範式」
--
-- 風險：低（純新表、無破壞、無 backfill、無對既有 service 影響）
-- ============================================================================

-- ============================================================================
-- 1. sequence + gen_id function
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx02_partner_part_id START 1;

CREATE OR REPLACE FUNCTION gen_nx02_partner_part_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02PNPT' || LPAD(nextval('seq_nx02_partner_part_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx02_partner_part
-- ============================================================================

CREATE TABLE "nx02_partner_part" (
    "id"                 VARCHAR(15)   NOT NULL DEFAULT gen_nx02_partner_part_id(),
    "tenant_id"          VARCHAR(15)   NOT NULL,
    "partner_id"         VARCHAR(15)   NOT NULL,
    "part_id"            VARCHAR(15)   NOT NULL,
    "is_primary"         BOOLEAN       NOT NULL DEFAULT false,
    "supplier_part_no"   VARCHAR(50),
    "default_unit_cost"  DECIMAL(14, 4),
    "default_lead_days"  INTEGER,
    "moq"                DECIMAL(14, 4),
    "source"             VARCHAR(1)    NOT NULL DEFAULT 'S',
    "valid_from"         DATE,
    "valid_to"           DATE,
    "is_active"          BOOLEAN       NOT NULL DEFAULT true,
    "remark"             VARCHAR(200),
    "created_at"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"         VARCHAR(15)   NOT NULL,
    "updated_at"         TIMESTAMP(3)  NOT NULL,
    "updated_by"         VARCHAR(15)   NOT NULL,

    CONSTRAINT "nx02_partner_part_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 3. indexes
-- ============================================================================

CREATE UNIQUE INDEX "nx02_partner_part_tenant_partner_part_valid_from_key"
  ON "nx02_partner_part"("tenant_id", "partner_id", "part_id", "valid_from");

CREATE INDEX "nx02_partner_part_tenant_partner_idx"
  ON "nx02_partner_part"("tenant_id", "partner_id");

CREATE INDEX "nx02_partner_part_tenant_part_idx"
  ON "nx02_partner_part"("tenant_id", "part_id");

CREATE INDEX "nx02_partner_part_tenant_is_primary_idx"
  ON "nx02_partner_part"("tenant_id", "is_primary");

-- ============================================================================
-- 4. FKs
-- ============================================================================

ALTER TABLE "nx02_partner_part"
  ADD CONSTRAINT "nx02_partner_part_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_partner_part"
  ADD CONSTRAINT "nx02_partner_part_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_partner_part"
  ADD CONSTRAINT "nx02_partner_part_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 完成：PartnerPart 主檔落地（partner ↔ part 中間表）
-- 後續：Phase 2 PartnerPartService CRUD service + endpoint
-- ============================================================================
