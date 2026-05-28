-- TASK-NX02-PURCHASE-M1-SCHEMA-01
-- NEXORA LITE 階段 1 進貨模組 M1：schema 補欄位 + 4 新表
--
-- 對應 Crown 2026-05-28 拍板 + Alex M1 放行：
--   1. nx02_rr_import + exchange_rate（匯率鎖定）/ cost_per_unit 標 deprecated
--   2. nx02_rr_item + original_unit_cost / allocated_import_fee / actual_unit_cost
--   3. nx01_partner + supplier_grade_id（FK nx01_supplier_grade）
--   4. 新表 nx01_supplier_grade（供應商分級主檔、對齊 customer_grade 範式）
--   5. 新表 nx02_warranty_claim（保固申請單、兩型 + 4 結果）
--   6. 新表 nx02_warranty_claim_attachment（保固附件、對齊 nx01_bulletin_attachment 範式）
--   7. 新表 nx02_rfq_greeting_template（詢價客套話設定、每租戶 1:1）
--   8. nx02_rfq.supplier_id / rfq_type 註解收斂（純 COMMENT、不動結構）
--
-- ⚠️ M1 只做 schema + migration、service 邏輯 M2 處理
-- ⚠️ source_so_id 預留 nullable 欄位（不建 FK constraint）、NX04 SO 還沒做 LITE
-- ⚠️ Railway production 維持落後 + 1 = 69 支（A077）、本 migration 仍 localhost-only
-- ⚠️ 全 NOT NULL DEFAULT 範式：既有資料零破壞（既有 RrImport/RrItem 加新欄位帶 default、Partner 加 nullable）

-- =============================================================================
-- 1. ID 生成 function（對齊既有 gen_*_id() 範式：[NX01/02]+[4字]+[7位]）
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx01_supplier_grade_id;
CREATE OR REPLACE FUNCTION gen_nx01_supplier_grade_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01SUGR' || LPAD(nextval('seq_nx01_supplier_grade_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_warranty_claim_id;
CREATE OR REPLACE FUNCTION gen_nx02_warranty_claim_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02WCLM' || LPAD(nextval('seq_nx02_warranty_claim_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_warranty_claim_attachment_id;
CREATE OR REPLACE FUNCTION gen_nx02_warranty_claim_attachment_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02WCAT' || LPAD(nextval('seq_nx02_warranty_claim_attachment_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_rfq_greeting_template_id;
CREATE OR REPLACE FUNCTION gen_nx02_rfq_greeting_template_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02RGTM' || LPAD(nextval('seq_nx02_rfq_greeting_template_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =============================================================================
-- 2. 既有表加欄位
-- =============================================================================

-- 2.1 nx02_rr_import: 加 exchange_rate（匯率鎖定）
ALTER TABLE "nx02_rr_import"
  ADD COLUMN "exchange_rate" DECIMAL(15, 6) NOT NULL DEFAULT 1;

COMMENT ON COLUMN "nx02_rr_import"."exchange_rate"
  IS '買入時匯率（鎖定）。批次成本永久以此匯率計算 TWD、不隨匯率波動重算。例：USD→TWD 31.500000。';

COMMENT ON COLUMN "nx02_rr_import"."cost_per_unit"
  IS '@deprecated 既有「按數量平均」公式（total_import_cost ÷ total_qty），LITE 階段 1 起改「按金額比例」攤分到 nx02_rr_item.allocated_import_fee，本欄位保留向後相容、service 不再寫入。';

-- 2.2 nx02_rr_item: 加 3 個成本欄位（原始外幣 / 攤分進口費 / 實際入庫成本）
ALTER TABLE "nx02_rr_item"
  ADD COLUMN "original_unit_cost"   DECIMAL(14, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "allocated_import_fee" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "actual_unit_cost"     DECIMAL(14, 4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN "nx02_rr_item"."original_unit_cost"
  IS '原始外幣單價（國內 = TWD 跟 unit_cost 同值、國外 = 換匯前外幣值）。審計留底用、跟 unit_cost 並存。LITE 階段 1 新加。';

COMMENT ON COLUMN "nx02_rr_item"."allocated_import_fee"
  IS '攤分到此 item 的進口費用（按金額比例：額外費用總額 × (該零件貨款 ÷ 批內總貨款)、國內 = 0）。LITE 階段 1 新加。';

COMMENT ON COLUMN "nx02_rr_item"."actual_unit_cost"
  IS '實際入庫成本（TWD、含換匯+進口費攤分）= (original_unit_cost × exchange_rate × qty + allocated_import_fee) ÷ qty。過帳 applyQtyInWithLedger 用此值算移動平均。LITE 階段 1 新加。';

COMMENT ON COLUMN "nx02_rr_item"."unit_cost"
  IS '單位成本（原始單價：國內 = TWD 直接成本、國外 = 外幣單價未換匯）。LITE 階段 1 語意收斂：跟 actual_unit_cost 分離、TWD 換匯+進口費攤分後寫入 actual_unit_cost。';

-- 2.3 nx01_partner: 加 supplier_grade_id（nullable、業務手動指派為主）
ALTER TABLE "nx01_partner"
  ADD COLUMN "supplier_grade_id" VARCHAR(15);

COMMENT ON COLUMN "nx01_partner"."supplier_grade_id"
  IS '供應商等級 ID（FK nx01_supplier_grade），採購視角、partner_type=''S'' 純供應商用。LITE 階段 1 手動指派為主（初期數據累積後再補自動算：付款條件→信用紀錄→不良率）。';

-- 2.4 nx02_rfq: 註解收斂（純 COMMENT、不動結構）
COMMENT ON COLUMN "nx02_rfq"."supplier_id"
  IS '主供應商（交易對象 ID、可空：LITE 階段 1 簡化詢價範式 = 系統不預先綁供應商名單、業務複製詢價文字到外部問、回價時記錄到 nx02_qt；本欄位保留作「優先意向供應商」可選欄、application 層 guard partner_type=''S'' 純供應商）。';

COMMENT ON COLUMN "nx02_rfq"."rfq_type"
  IS '詢價類型（G=一般詢價：採購多家供應商比價工具/P=同行調貨詢價：銷售業務調貨用）。LITE 階段 1 範式：G 型 = 業務從料件+數量發起→產生詢價文字→自己拿去 LINE/電話問→回價填入 nx02_qt 並排比價→選一家開 PO；P 型既有同行調貨範式不變（Qt.partner_type=O 同行）後續只能建立調貨單 TI 不能建立 PO。';

-- =============================================================================
-- 3. 新表 nx01_supplier_grade（供應商分級主檔）
-- =============================================================================

CREATE TABLE "nx01_supplier_grade" (
  "id"          VARCHAR(15) NOT NULL DEFAULT gen_nx01_supplier_grade_id(),
  "tenant_id"   VARCHAR(15) NOT NULL,
  "code"        VARCHAR(10) NOT NULL,
  "name"        VARCHAR(50) NOT NULL,
  "description" VARCHAR(200),
  "sort_no"     INTEGER NOT NULL,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"  VARCHAR(15) NOT NULL,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "updated_by"  VARCHAR(15) NOT NULL,

  CONSTRAINT "nx01_supplier_grade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx01_supplier_grade_tenant_id_code_key"
  ON "nx01_supplier_grade"("tenant_id", "code");

ALTER TABLE "nx01_supplier_grade"
  ADD CONSTRAINT "nx01_supplier_grade_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx01_partner"
  ADD CONSTRAINT "nx01_partner_supplier_grade_id_fkey"
  FOREIGN KEY ("supplier_grade_id") REFERENCES "nx01_supplier_grade"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON TABLE "nx01_supplier_grade"
  IS '供應商分級主檔（A/B/C/D、對齊 nx01_customer_grade 範式）。LITE 階段 1 新加。';

-- =============================================================================
-- 4. 新表 nx02_warranty_claim（保固申請單）
-- =============================================================================

CREATE TABLE "nx02_warranty_claim" (
  "id"                VARCHAR(15) NOT NULL DEFAULT gen_nx02_warranty_claim_id(),
  "tenant_id"         VARCHAR(15) NOT NULL,
  "doc_no"            VARCHAR(30) NOT NULL,
  "claim_type"        VARCHAR(4)  NOT NULL,
  "source_so_id"      VARCHAR(15),
  "source_so_no"      VARCHAR(30),
  "supplier_id"       VARCHAR(15) NOT NULL,
  "part_id"           VARCHAR(15) NOT NULL,
  "part_no"           VARCHAR(50) NOT NULL,
  "part_name"         VARCHAR(200) NOT NULL,
  "qty"               DECIMAL(14, 4) NOT NULL DEFAULT 0,
  "claim_date"        DATE NOT NULL,
  "issue_description" VARCHAR(1000) NOT NULL,
  "status"            VARCHAR(1) NOT NULL DEFAULT 'D',
  "result"            VARCHAR(3),
  "result_remark"     VARCHAR(500),
  "resulted_at"       TIMESTAMP(3),
  "resulted_by"       VARCHAR(15),
  "remark"            VARCHAR(500),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"        VARCHAR(15) NOT NULL,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  "updated_by"        VARCHAR(15) NOT NULL,
  "voided_at"         TIMESTAMP(3),
  "voided_by"         VARCHAR(15),

  CONSTRAINT "nx02_warranty_claim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx02_warranty_claim_doc_no_key"
  ON "nx02_warranty_claim"("doc_no");

CREATE INDEX "nx02_warranty_claim_tenant_supplier_idx"
  ON "nx02_warranty_claim"("tenant_id", "supplier_id");

CREATE INDEX "nx02_warranty_claim_tenant_part_idx"
  ON "nx02_warranty_claim"("tenant_id", "part_id");

CREATE INDEX "nx02_warranty_claim_tenant_status_idx"
  ON "nx02_warranty_claim"("tenant_id", "status");

ALTER TABLE "nx02_warranty_claim"
  ADD CONSTRAINT "nx02_warranty_claim_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_warranty_claim"
  ADD CONSTRAINT "nx02_warranty_claim_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "nx01_partner"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_warranty_claim"
  ADD CONSTRAINT "nx02_warranty_claim_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMENT ON TABLE "nx02_warranty_claim"
  IS '保固申請單：兩型發起（CUST 客訴 / SELF 自用）+ 4 種審核結果（NEW/REF/RPR/REJ）。claim_type=CUST 連 source_so_id（NX04 SO 還沒做 LITE、暫不建 FK constraint、純 nullable 預留）。LITE 階段 1 新加。';

COMMENT ON COLUMN "nx02_warranty_claim"."claim_type"
  IS '申請類型（CUST=客訴型連 SO / SELF=自用型不連 SO）。';

COMMENT ON COLUMN "nx02_warranty_claim"."status"
  IS '狀態（D=DRAFT 草稿 / S=SUBMITTED 已送出 / R=REVIEWING 供應商審核中 / C=COMPLETED 已完成有審核結果 / V=VOIDED 作廢）。';

COMMENT ON COLUMN "nx02_warranty_claim"."result"
  IS '審核結果（status=C 才有值：NEW=換新 / REF=退錢 / RPR=維修後還 / REJ=駁回 / null=尚未審核）。';

-- =============================================================================
-- 5. 新表 nx02_warranty_claim_attachment（保固附件）
-- =============================================================================

CREATE TABLE "nx02_warranty_claim_attachment" (
  "id"               VARCHAR(15) NOT NULL DEFAULT gen_nx02_warranty_claim_attachment_id(),
  "tenant_id"        VARCHAR(15) NOT NULL,
  "claim_id"         VARCHAR(15) NOT NULL,
  "file_type"        VARCHAR(3) NOT NULL,
  "storage_key"      VARCHAR(500) NOT NULL,
  "mime_type"        VARCHAR(100) NOT NULL,
  "file_size"        INTEGER NOT NULL,
  "orig_filename"    VARCHAR(255) NOT NULL,
  "uploader_user_id" VARCHAR(15) NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "nx02_warranty_claim_attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nx02_warranty_claim_attachment_claim_id_idx"
  ON "nx02_warranty_claim_attachment"("claim_id");

ALTER TABLE "nx02_warranty_claim_attachment"
  ADD CONSTRAINT "nx02_warranty_claim_attachment_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_warranty_claim_attachment"
  ADD CONSTRAINT "nx02_warranty_claim_attachment_claim_id_fkey"
  FOREIGN KEY ("claim_id") REFERENCES "nx02_warranty_claim"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nx02_warranty_claim_attachment"
  ADD CONSTRAINT "nx02_warranty_claim_attachment_uploader_user_id_fkey"
  FOREIGN KEY ("uploader_user_id") REFERENCES "nx01_user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMENT ON TABLE "nx02_warranty_claim_attachment"
  IS '保固申請附件：行照 LIC / 照片 PHO / 影片 VID 三型、對齊 nx01_bulletin_attachment 範式（storage_key + mime_type + file_size、application 層 guard 檔案大小）。LITE 階段 1 新加。';

COMMENT ON COLUMN "nx02_warranty_claim_attachment"."file_type"
  IS '檔案類型（LIC=行照 / PHO=問題照片 / VID=影片）。';

COMMENT ON COLUMN "nx02_warranty_claim_attachment"."file_size"
  IS '檔案大小（bytes、application 層 guard：照片 ≤ 10MB / 影片 ≤ 100MB / 行照 ≤ 5MB）。';

-- =============================================================================
-- 6. 新表 nx02_rfq_greeting_template（詢價文字客套話設定）
-- =============================================================================

CREATE TABLE "nx02_rfq_greeting_template" (
  "id"               VARCHAR(15) NOT NULL DEFAULT gen_nx02_rfq_greeting_template_id(),
  "tenant_id"        VARCHAR(15) NOT NULL,
  "greeting_content" VARCHAR(500) NOT NULL DEFAULT '您好、想詢價以下零件：',
  "closing_content"  VARCHAR(500) NOT NULL DEFAULT '麻煩報價謝謝',
  "is_active"        BOOLEAN NOT NULL DEFAULT true,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"       VARCHAR(15) NOT NULL,
  "updated_at"       TIMESTAMP(3) NOT NULL,
  "updated_by"       VARCHAR(15) NOT NULL,

  CONSTRAINT "nx02_rfq_greeting_template_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx02_rfq_greeting_template_tenant_id_key"
  ON "nx02_rfq_greeting_template"("tenant_id");

ALTER TABLE "nx02_rfq_greeting_template"
  ADD CONSTRAINT "nx02_rfq_greeting_template_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMENT ON TABLE "nx02_rfq_greeting_template"
  IS '詢價文字客套話設定（每租戶 1:1、unique）：業務從料件+數量發起詢價、系統產生「開頭客套話 + 料件清單 + 結尾客套話」、業務複製到 LINE/電話問供應商。LITE 階段 1 新加。';
