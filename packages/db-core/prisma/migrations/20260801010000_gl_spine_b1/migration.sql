-- packages/db-core/prisma/migrations/20260801010000_gl_spine_b1/migration.sql
-- 總帳脊椎 B 階段 B1：傳票／分錄行／科目餘額（2026-08-01 執行長拍板 §5 五題）
--   規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md v0.2
--   上位原則（0724 討論）：營運事件原子生成分錄／過帳後只能紅字沖銷／會計永不回頭寫營運
-- 非破壞：3 張新表 additive，既有表一欄未動（僅補反向關聯，Prisma 層無 DDL）。
-- ⚠️ 本機 migration 追蹤表壞 → 沿用 prisma db execute 手動套的範式。
-- ⚠️ 套用後請重跑 packages/db-core/scripts/gen-table-comments.mjs 同步欄位 COMMENT。

-- =========================================================
-- 1) ID 產生器
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS seq_nx05_voucher_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_voucher_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05VOUC' || LPAD(nextval('seq_nx05_voucher_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_voucher_line_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_voucher_line_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05VCLN' || LPAD(nextval('seq_nx05_voucher_line_id')::text, 7, '0');
$$ LANGUAGE sql;
CREATE SEQUENCE IF NOT EXISTS seq_nx05_gl_balance_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_gl_balance_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05GLBL' || LPAD(nextval('seq_nx05_gl_balance_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =========================================================
-- 2) DDL（prisma migrate diff 產生、已檢查：DROP 0 / ALTER COLUMN 0 / 純 additive）
-- =========================================================
-- CreateTable
CREATE TABLE "nx05_voucher" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_voucher_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(30) NOT NULL,
    "voucher_date" DATE NOT NULL,
    "fiscal_period_id" VARCHAR(15) NOT NULL,
    "posting_rule_id" VARCHAR(15),
    "source_doc_type" VARCHAR(10),
    "source_doc_id" VARCHAR(15),
    "source_doc_no" VARCHAR(30),
    "origin" VARCHAR(10) NOT NULL DEFAULT 'AUTO',
    "summary" VARCHAR(200),
    "total_debit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "total_credit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(10) NOT NULL DEFAULT 'DRAFT',
    "posted_at" TIMESTAMP(3),
    "posted_by" VARCHAR(15),
    "reversal_of_voucher_id" VARCHAR(15),
    "void_reason" VARCHAR(200),
    "remark" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_voucher_line" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_voucher_line_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "voucher_id" VARCHAR(15) NOT NULL,
    "line_no" INTEGER NOT NULL DEFAULT 1,
    "dr_cr" VARCHAR(1) NOT NULL,
    "account_code_id" VARCHAR(15) NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "department_id" VARCHAR(15),
    "partner_id" VARCHAR(15),
    "employee_user_id" VARCHAR(15),
    "bank_account_id" VARCHAR(15),
    "tax_code_id" VARCHAR(15),
    "summary" VARCHAR(200),
    "posting_rule_line_id" VARCHAR(15),
    "source_doc_item_id" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_voucher_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx05_gl_balance" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_gl_balance_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "fiscal_period_id" VARCHAR(15) NOT NULL,
    "account_code_id" VARCHAR(15) NOT NULL,
    "department_id" VARCHAR(15),
    "opening_debit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "opening_credit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "period_debit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "period_credit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "closing_debit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "closing_credit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "recalculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx05_gl_balance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nx05_voucher_tenant_id_fiscal_period_id_status_idx" ON "nx05_voucher"("tenant_id", "fiscal_period_id", "status");

-- CreateIndex
CREATE INDEX "nx05_voucher_tenant_id_source_doc_type_source_doc_id_idx" ON "nx05_voucher"("tenant_id", "source_doc_type", "source_doc_id");

-- CreateIndex
CREATE INDEX "nx05_voucher_tenant_id_voucher_date_idx" ON "nx05_voucher"("tenant_id", "voucher_date");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_voucher_tenant_id_doc_no_key" ON "nx05_voucher"("tenant_id", "doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_voucher_reversal_of_voucher_id_key" ON "nx05_voucher"("reversal_of_voucher_id");

-- CreateIndex
CREATE INDEX "nx05_voucher_line_tenant_id_account_code_id_idx" ON "nx05_voucher_line"("tenant_id", "account_code_id");

-- CreateIndex
CREATE INDEX "nx05_voucher_line_tenant_id_department_id_idx" ON "nx05_voucher_line"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "nx05_voucher_line_tenant_id_partner_id_idx" ON "nx05_voucher_line"("tenant_id", "partner_id");

-- CreateIndex
CREATE INDEX "nx05_voucher_line_tenant_id_bank_account_id_idx" ON "nx05_voucher_line"("tenant_id", "bank_account_id");

-- CreateIndex
CREATE INDEX "nx05_voucher_line_tenant_id_employee_user_id_idx" ON "nx05_voucher_line"("tenant_id", "employee_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_voucher_line_voucher_id_line_no_key" ON "nx05_voucher_line"("voucher_id", "line_no");

-- CreateIndex
CREATE INDEX "nx05_gl_balance_tenant_id_account_code_id_idx" ON "nx05_gl_balance"("tenant_id", "account_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx05_gl_balance_tenant_id_fiscal_period_id_account_code_id__key" ON "nx05_gl_balance"("tenant_id", "fiscal_period_id", "account_code_id", "department_id");

-- AddForeignKey
ALTER TABLE "nx05_voucher" ADD CONSTRAINT "nx05_voucher_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher" ADD CONSTRAINT "nx05_voucher_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "nx05_fiscal_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher" ADD CONSTRAINT "nx05_voucher_posting_rule_id_fkey" FOREIGN KEY ("posting_rule_id") REFERENCES "nx05_posting_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher" ADD CONSTRAINT "nx05_voucher_reversal_of_voucher_id_fkey" FOREIGN KEY ("reversal_of_voucher_id") REFERENCES "nx05_voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher_line" ADD CONSTRAINT "nx05_voucher_line_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher_line" ADD CONSTRAINT "nx05_voucher_line_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "nx05_voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher_line" ADD CONSTRAINT "nx05_voucher_line_account_code_id_fkey" FOREIGN KEY ("account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher_line" ADD CONSTRAINT "nx05_voucher_line_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "nx01_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher_line" ADD CONSTRAINT "nx05_voucher_line_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "nx01_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher_line" ADD CONSTRAINT "nx05_voucher_line_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher_line" ADD CONSTRAINT "nx05_voucher_line_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "nx05_bank_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher_line" ADD CONSTRAINT "nx05_voucher_line_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "nx05_tax_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_voucher_line" ADD CONSTRAINT "nx05_voucher_line_posting_rule_line_id_fkey" FOREIGN KEY ("posting_rule_line_id") REFERENCES "nx05_posting_rule_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_gl_balance" ADD CONSTRAINT "nx05_gl_balance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_gl_balance" ADD CONSTRAINT "nx05_gl_balance_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "nx05_fiscal_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_gl_balance" ADD CONSTRAINT "nx05_gl_balance_account_code_id_fkey" FOREIGN KEY ("account_code_id") REFERENCES "nx05_account_code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_gl_balance" ADD CONSTRAINT "nx05_gl_balance_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "nx01_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- =========================================================
-- 3) 🔴 科目餘額唯一鍵改 NULLS NOT DISTINCT
--    department_id 可為 null（不分部門的科目）。Postgres 預設「NULL 彼此不相等」，
--    → 同一個科目×期間會被允許插入多列 department_id=NULL 的餘額，唯一鍵形同虛設。
--    PG15+ 支援 NULLS NOT DISTINCT，本機/Railway 皆 PG16 → 直接用。
--    ⚠️ Prisma schema 語法無法表達這個修飾詞，故在 migration 補；Prisma 不會因此報 drift。
-- =========================================================
ALTER TABLE "nx05_gl_balance"
  DROP CONSTRAINT IF EXISTS "nx05_gl_balance_tenant_id_fiscal_period_id_account_code_id__key";
DROP INDEX IF EXISTS "nx05_gl_balance_tenant_id_fiscal_period_id_account_code_id__key";
CREATE UNIQUE INDEX "nx05_gl_balance_tenant_id_fiscal_period_id_account_code_id__key"
  ON "nx05_gl_balance" ("tenant_id", "fiscal_period_id", "account_code_id", "department_id")
  NULLS NOT DISTINCT;

-- ⚠️ 對照：nx05_voucher.reversal_of_voucher_id 的唯一鍵刻意「不」改 NULLS NOT DISTINCT——
--    絕大多數傳票都不是沖銷傳票（該欄為 NULL），需要允許多個 NULL 並存；
--    非 NULL 的部分維持唯一，即「一張傳票只能被沖銷一次」。兩者需求相反，不可一起改。

-- =========================================================
-- 4) 表層 COMMENT
-- =========================================================
COMMENT ON TABLE "nx05_voucher" IS '傳票單頭（單據過帳時原子生成、非人工打）（總帳脊椎 B 階段 2026-08-01）';
COMMENT ON TABLE "nx05_voucher_line" IS '分錄行（四維度：部門／往來對象或員工／銀行帳戶＋稅別）（總帳脊椎 B 階段 2026-08-01）';
COMMENT ON TABLE "nx05_gl_balance" IS '科目餘額／總分類帳（唯一維度＝部門）（總帳脊椎 B 階段 2026-08-01）';
