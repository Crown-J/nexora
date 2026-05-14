-- packages/db-core/prisma/migrations/20260515130000_nx01_16_part_model_create/migration.sql
-- ============================================================================
-- Migration: nx01_16_part_model_create
-- 建立日期：2026-05-15
-- 任務：TASK-NX01-16-IMPL commit 1（NX01-16 料號車型適配從零建）
-- 對應 spec：docs/nx01/spec/intent/nx01-16-part-model.md v1.0
--
-- 範圍：擴充原則 #23 類型 1「加新東西」、全新表、空 seed
-- 戰略意義：NX01 17 份子規格書最後 1 份、戰略表 ⭐⭐、
--           Yaro 30 年知識結構化核心、part ↔ model 適配關聯
--
-- 變更：
--   1. sequence + gen_id function（NX01PAMO、Q6=A 拍板）
--   2. CREATE TABLE nx01_part_model
--      6 業務欄位（partId + modelId + fitLevel + remark + sortNo + isActive）
--      + 5 系統欄位（id + tenantId + audit 5）
--   3. indexes：
--      UNIQUE (tenantId, partId, modelId)：1 料 + 1 車 = 1 行（Q1=A 拍板）
--      INDEX (tenantId, partId)：料件反查車型（Q7=A 反查 UI 用）
--      INDEX (tenantId, modelId)：車型反查料件（A072 後續軌備用）
--   4. FKs：tenant + part (RESTRICT) + model (RESTRICT)
--
-- 對齊 Crown 拍板（規格 §1 / §3 / §4）：
--   Q1=A unique = (tenantId, partId, modelId)
--   Q3=B fitLevel SmallInt enum（1=原廠 / 2=副廠等效 / 3=通用替代）
--   Q5=A 空表進、tenant 自加
--   Q6=A prefix PAMO（對齊 PABR / PAGR / PARE 既有 4 字範式）
-- ============================================================================

-- ============================================================================
-- 1. sequence + gen_id function
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx01_part_model_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_part_model_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PAMO' || LPAD(nextval('seq_nx01_part_model_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx01_part_model
-- ============================================================================

CREATE TABLE "nx01_part_model" (
    "id"           VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_model_id(),
    "tenant_id"    VARCHAR(15) NOT NULL,
    "part_id"      VARCHAR(15) NOT NULL,
    "model_id"     VARCHAR(15) NOT NULL,
    -- fitLevel：Q3=B SmallInt enum（1=原廠 / 2=副廠等效 / 3=通用替代）
    "fit_level"    SMALLINT NOT NULL DEFAULT 1,
    "remark"       VARCHAR(200),
    "sort_no"      INTEGER NOT NULL DEFAULT 0,
    "is_active"    BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"   VARCHAR(15) NOT NULL,
    "updated_at"   TIMESTAMP(3) NOT NULL,
    "updated_by"   VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_part_model_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 3. indexes
-- ============================================================================

-- Q1=A：1 料 + 1 車 = 1 行（race condition 防護）
CREATE UNIQUE INDEX "nx01_part_model_tenant_id_part_id_model_id_key"
  ON "nx01_part_model"("tenant_id", "part_id", "model_id");

-- 規格 §2.3 + Q7=A：料件反查車型（業務員「查料 → 適配車型清單」單向反查用）
CREATE INDEX "nx01_part_model_tenant_id_part_id_idx"
  ON "nx01_part_model"("tenant_id", "part_id");

-- 後續軌 A072 備用：車型反查料件（業務員「查車 → 適配料件清單」反向）
CREATE INDEX "nx01_part_model_tenant_id_model_id_idx"
  ON "nx01_part_model"("tenant_id", "model_id");

-- ============================================================================
-- 4. FKs（3 FK：tenant + part + model）
-- ============================================================================

ALTER TABLE "nx01_part_model"
  ADD CONSTRAINT "nx01_part_model_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 規格 §3.4：兩端 FK 都 ON DELETE RESTRICT、保護 reverse 引用
ALTER TABLE "nx01_part_model"
  ADD CONSTRAINT "nx01_part_model_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_part_model"
  ADD CONSTRAINT "nx01_part_model_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "nx01_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 完成：NX01-16 料號車型適配主檔落地、空 seed、tenant 自加
-- ⭐ NX01 17 份子規格書 + impl 全 closure（本表為最後 1 份）
-- 後續軌：
--   - commit 2：後端 controller + service + DTO + module
--   - commit 3：前端 UI feature
--   - commit 4：reference 3 處 drift 補登
--   - A072：車型反查料件雙向 UI
--   - A073：part 編輯頁適配 section UX 升級
--   - Yaro 30 年資料匯入軌（PRO tier 戰略）
-- ============================================================================
