-- TASK-NX04-SALES-LITE-M1-SCHEMA
-- NEXORA LITE 階段 3 銷貨模組 M1：schema 補欄位 + 1 新表
--
-- 對應 Crown 2026-05-29 拍板（PM Alex M1 開工指令、§A Q5 + Q6）：
--   Q5. SR item 好品/壞品旗標：方案 B、新增 disposition_flag VARCHAR(1) nullable
--       語意：returnReason = 客戶口述（業務記錄）/ disposition_flag = 倉管檢查後判斷（事實、過帳依據）
--       分流：G=好品入主倉 / B=壞品進 Nx03IssueReport（issueType='D'）
--   Q6. 新建 nx01_partner_grade_history（客戶等級變更歷史）
--       前綴 PGHI、ID 範例 NX01PGHI0000001
--       狀態流 PENDING/APPROVED/REJECTED、APPROVED 後 partner.customer_grade_id 同步更新
--
-- ⚠️ M1 只做 schema + migration、service 邏輯 M2 處理
-- ⚠️ 全 NULLABLE / DEFAULT 範式：既有 nx04_sr_item 零破壞（disposition_flag 預設 NULL）
-- ⚠️ approved_by / requested_by 純 VARCHAR(15) 不建 FK 對 user、對齊既有 8 處 approvedBy 範式
-- ⚠️ 不動既有 Nx04Quote / Nx04So / Nx04Sr 表頭、Q1~Q4 沿用既有狀態流（M2 service 語意對齊）

-- =============================================================================
-- 1. ID 生成 function（對齊既有 gen_*_id() 範式：[NX01]+[4字 PGHI]+[7位]）
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx01_partner_grade_history_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_partner_grade_history_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PGHI' || LPAD(nextval('seq_nx01_partner_grade_history_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =============================================================================
-- 2. CREATE TABLE nx01_partner_grade_history
-- =============================================================================

CREATE TABLE "nx01_partner_grade_history" (
    "id"            VARCHAR(15)  NOT NULL DEFAULT gen_nx01_partner_grade_history_id(),
    "tenant_id"     VARCHAR(15)  NOT NULL,
    "partner_id"    VARCHAR(15)  NOT NULL,
    "old_grade_id"  VARCHAR(15)  NOT NULL,
    "new_grade_id"  VARCHAR(15)  NOT NULL,
    "status"        VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
    "requested_by"  VARCHAR(15)  NOT NULL,
    "requested_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason"        VARCHAR(200) NOT NULL,
    "approved_by"   VARCHAR(15),
    "approved_at"   TIMESTAMP(3),
    "reject_reason" VARCHAR(200),
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"    VARCHAR(15)  NOT NULL,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    "updated_by"    VARCHAR(15)  NOT NULL,

    CONSTRAINT "nx01_partner_grade_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nx01_partner_grade_history_tenant_partner_idx"
    ON "nx01_partner_grade_history"("tenant_id", "partner_id");

CREATE INDEX "nx01_partner_grade_history_tenant_status_idx"
    ON "nx01_partner_grade_history"("tenant_id", "status");

ALTER TABLE "nx01_partner_grade_history"
    ADD CONSTRAINT "nx01_partner_grade_history_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_partner_grade_history"
    ADD CONSTRAINT "nx01_partner_grade_history_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_partner_grade_history"
    ADD CONSTRAINT "nx01_partner_grade_history_old_grade_id_fkey"
    FOREIGN KEY ("old_grade_id") REFERENCES "nx01_customer_grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_partner_grade_history"
    ADD CONSTRAINT "nx01_partner_grade_history_new_grade_id_fkey"
    FOREIGN KEY ("new_grade_id") REFERENCES "nx01_customer_grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- 3. ALTER nx04_sr_item：補 disposition_flag（好品/壞品旗標）
-- =============================================================================

ALTER TABLE "nx04_sr_item"
    ADD COLUMN "disposition_flag" VARCHAR(1);
