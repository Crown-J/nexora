-- NX04 報價/詢價紀錄架構 2026-07-06（執行長拍板）：兩張獨立「原子紀錄表」。
--   報價紀錄表 nx04_quote_record：客戶側，每次即時報價/報價單行寫一筆；餵報價單、銷貨單自動帶價+拉入。
--   詢價紀錄表 nx04_inquiry_record：調貨/同行側，每次即時詢價寫一筆；餵調貨單拉入。
-- ⚠️ 本機 migrate dev 壞（見 feedback_prisma7_quirks），此檔為紀錄；實際以 prisma db execute 套用。
-- 純加法（新表 + 新 gen_id 函式）、無 DROP、不動既有表。

-- ── 1. ID 產生器（同範式 gen_nx04_xxx_id()）──
CREATE SEQUENCE IF NOT EXISTS "seq_nx04_quote_record_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx04_quote_record_id() RETURNS VARCHAR(15) AS $$
BEGIN
  RETURN 'NX04QTRC' || LPAD(nextval('seq_nx04_quote_record_id')::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS "seq_nx04_inquiry_record_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx04_inquiry_record_id() RETURNS VARCHAR(15) AS $$
BEGIN
  RETURN 'NX04IQRC' || LPAD(nextval('seq_nx04_inquiry_record_id')::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- ── 2. 報價紀錄表（客戶側）──
CREATE TABLE "nx04_quote_record" (
  "id"                VARCHAR(15)   NOT NULL DEFAULT gen_nx04_quote_record_id(),
  "tenant_id"         VARCHAR(15)   NOT NULL,
  "record_date"       DATE          NOT NULL,
  "customer_id"       VARCHAR(15)   NOT NULL,
  "customer_grade_id" VARCHAR(15),
  "part_id"           VARCHAR(15)   NOT NULL,
  "part_no"           VARCHAR(50)   NOT NULL,
  "part_name"         VARCHAR(200)  NOT NULL,
  "warehouse_id"      VARCHAR(15),
  "qty"               DECIMAL(14,4) NOT NULL DEFAULT 1,
  "unit_price"        DECIMAL(14,4) NOT NULL,
  "currency_id"       VARCHAR(15)   NOT NULL DEFAULT 'TWD',
  "source"            VARCHAR(10)   NOT NULL DEFAULT 'INSTANT',
  "source_doc_id"     VARCHAR(15),
  "sales_person_id"   VARCHAR(15),
  "remark"            VARCHAR(200),
  "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"        VARCHAR(15)   NOT NULL,
  "updated_at"        TIMESTAMP(3)  NOT NULL,
  "updated_by"        VARCHAR(15)   NOT NULL,
  CONSTRAINT "nx04_quote_record_pkey" PRIMARY KEY ("id")
);

-- ── 3. 詢價紀錄表（調貨/同行側）──
CREATE TABLE "nx04_inquiry_record" (
  "id"                VARCHAR(15)   NOT NULL DEFAULT gen_nx04_inquiry_record_id(),
  "tenant_id"         VARCHAR(15)   NOT NULL,
  "record_date"       DATE          NOT NULL,
  "source_partner_id" VARCHAR(15)   NOT NULL,
  "part_id"           VARCHAR(15)   NOT NULL,
  "part_no"           VARCHAR(50)   NOT NULL,
  "part_name"         VARCHAR(200)  NOT NULL,
  "warehouse_id"      VARCHAR(15),
  "qty"               DECIMAL(14,4) NOT NULL DEFAULT 1,
  "unit_price"        DECIMAL(14,4) NOT NULL,
  "currency_id"       VARCHAR(15)   NOT NULL DEFAULT 'TWD',
  "sales_person_id"   VARCHAR(15),
  "remark"            VARCHAR(200),
  "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"        VARCHAR(15)   NOT NULL,
  "updated_at"        TIMESTAMP(3)  NOT NULL,
  "updated_by"        VARCHAR(15)   NOT NULL,
  CONSTRAINT "nx04_inquiry_record_pkey" PRIMARY KEY ("id")
);

-- ── 4. Index（tenant + 常用查詢維度）──
CREATE INDEX "nx04_quote_record_tenant_id_customer_id_part_id_idx" ON "nx04_quote_record"("tenant_id", "customer_id", "part_id");
CREATE INDEX "nx04_quote_record_tenant_id_part_id_idx"            ON "nx04_quote_record"("tenant_id", "part_id");
CREATE INDEX "nx04_quote_record_tenant_id_record_date_idx"        ON "nx04_quote_record"("tenant_id", "record_date");
CREATE INDEX "nx04_inquiry_record_tenant_id_source_partner_id_part_id_idx" ON "nx04_inquiry_record"("tenant_id", "source_partner_id", "part_id");
CREATE INDEX "nx04_inquiry_record_tenant_id_part_id_idx"          ON "nx04_inquiry_record"("tenant_id", "part_id");
CREATE INDEX "nx04_inquiry_record_tenant_id_record_date_idx"      ON "nx04_inquiry_record"("tenant_id", "record_date");

-- ── 5. Foreign key（顯示關鍵欄走 FK；grade/salesperson/source_doc/建更人 為 id 快照、不設 FK，同 createdBy 範式）──
ALTER TABLE "nx04_quote_record"
  ADD CONSTRAINT "nx04_quote_record_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx04_quote_record_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx04_quote_record_part_id_fkey"
    FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx04_quote_record_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx04_quote_record_currency_id_fkey"
    FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx04_inquiry_record"
  ADD CONSTRAINT "nx04_inquiry_record_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx04_inquiry_record_source_partner_id_fkey"
    FOREIGN KEY ("source_partner_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx04_inquiry_record_part_id_fkey"
    FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx04_inquiry_record_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "nx04_inquiry_record_currency_id_fkey"
    FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
