-- packages/db-core/prisma/migrations/20260425100300_phase0_b5_nx02_qt/migration.sql
-- ============================================================================
-- Migration: phase0_b5_nx02_qt
-- 建立日期：2026-04-25
-- 任務：TASK-WP-PHASE0-B5-RFQ-QT-API
-- 對應 spec：docs/nx02/spec/intent/rfq-qt-api-intent.md（Alex 重寫對齊新 schema 中）
--
-- 目的：
--   B5「同行詢價/報價/調貨」需要「1 RFQ : N QT」結構（每家同行給一個報價）。
--   既有 schema：
--     - nx02_rfq.supplier_id 是 header 級單一供應商
--     - nx02_rfq_item 是料號明細，無 partner 欄
--   兩者都不支援「1 RFQ 對 N 家同行各 1 報價」。
--
--   B5 採方案 B（Alex + Hank + Crown 共識）：
--   新建獨立 nx02_qt 表代表「同行對某 RFQ 的報價」。
--   既有 nx02_rfq / nx02_rfq_item 結構不動（B 方案精神：新建表、不破壞既有）。
--
--   業務語意：
--     - nx02_rfq         = 採購發起的詢價案
--     - nx02_rfq_item    = 該詢價案要問的料號清單（既有，料號明細）
--     - nx02_qt（新）    = 同行對該 RFQ 給的報價（每家同行 1 筆）
--
--   nx02_rfq.supplier_id 維持（向後相容），但語意降為「主聯絡」可有可無；
--   B5 邏輯走 nx02_qt.inquiry_partner_id，不依賴 RFQ.supplier_id。
--
-- 內容：
--   1. seq + gen_nx02_qt_id() function
--   2. CREATE TABLE nx02_qt
--   3. 4 個 indexes
--   4. 3 個 FKs (tenant / rfq / inquiry_partner)
--   5. CHECK constraint 限制 status 值域
--
-- 風險：LOW。新建獨立表，無既有資料、無既有 caller、不影響任何現有 service。
-- ============================================================================

-- ============================================================================
-- 1. Sequence + ID generator
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx02_qt_id START 1;

CREATE OR REPLACE FUNCTION gen_nx02_qt_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02QTHD' || LPAD(nextval('seq_nx02_qt_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx02_qt
-- ============================================================================

CREATE TABLE "nx02_qt" (
    "id"                  VARCHAR(15)    NOT NULL DEFAULT gen_nx02_qt_id(),
    "tenant_id"           VARCHAR(15)    NOT NULL,
    "rfq_id"              VARCHAR(15)    NOT NULL,
    "inquiry_partner_id"  VARCHAR(15)    NOT NULL,
    "quoted_price"        DECIMAL(14, 4) NOT NULL,
    "quoted_quantity"     DECIMAL(14, 4) NOT NULL,
    "lead_days"           INTEGER,
    "status"              VARCHAR(1)     NOT NULL DEFAULT 'P',
    "notes"               VARCHAR(200),
    "reject_reason"       VARCHAR(200),
    "created_at"          TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"          VARCHAR(15)    NOT NULL,
    "updated_at"          TIMESTAMP(3)   NOT NULL,
    "updated_by"          VARCHAR(15)    NOT NULL,
    CONSTRAINT "nx02_qt_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 3. Indexes
-- ============================================================================

CREATE INDEX "nx02_qt_tenant_rfq_idx"     ON "nx02_qt"("tenant_id", "rfq_id");
CREATE INDEX "nx02_qt_tenant_partner_idx" ON "nx02_qt"("tenant_id", "inquiry_partner_id");
CREATE INDEX "nx02_qt_tenant_status_idx"  ON "nx02_qt"("tenant_id", "status");

-- ============================================================================
-- 4. Foreign Keys
-- ============================================================================

ALTER TABLE "nx02_qt" ADD CONSTRAINT "nx02_qt_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_qt" ADD CONSTRAINT "nx02_qt_rfq_id_fkey"
    FOREIGN KEY ("rfq_id") REFERENCES "nx02_rfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_qt" ADD CONSTRAINT "nx02_qt_inquiry_partner_id_fkey"
    FOREIGN KEY ("inquiry_partner_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 5. CHECK constraint
-- ============================================================================

-- status: P=PENDING / A=AGREED / R=REJECTED
ALTER TABLE "nx02_qt"
    ADD CONSTRAINT "chk_nx02_qt_status"
    CHECK ("status" IN ('P', 'A', 'R'));

-- 拒絕原因 reject_reason 在 status='R' 時必填（業務需求，意圖版 §5.4）
-- 採 application-layer 自律 + DB partial CHECK：status='R' 時 reject_reason 不可為 null
ALTER TABLE "nx02_qt"
    ADD CONSTRAINT "chk_nx02_qt_reject_reason_when_rejected"
    CHECK (
        ("status" != 'R')
        OR ("reject_reason" IS NOT NULL AND char_length("reject_reason") > 0)
    );

-- 註：(tenant, rfq, partner) 三元組允許多筆 QT — 同行可重新報價，舊 QT 維持原狀
-- 作為比較歷史（Crown 拍板 2026-04-25）。採用某 QT 時 application 層會把同 partner
-- 其他較舊的 QT 標 rejected，避免 pending 殘留。
