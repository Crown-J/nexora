-- v1.2 對齊軌 階段 C：開戶後台 + 雙精靈 schema
-- 對齊 v1.2 §2 開戶後台 + §3 雙精靈 + §12.3 系統參數

-- ─────────────────────────────────────────
-- Nx99Tenant 加開戶用 + 資料起算點欄位
-- ─────────────────────────────────────────
ALTER TABLE "nx99_tenant" ADD COLUMN "tax_id" VARCHAR(20);
ALTER TABLE "nx99_tenant" ADD COLUMN "address" VARCHAR(200);
ALTER TABLE "nx99_tenant" ADD COLUMN "phone" VARCHAR(30);
ALTER TABLE "nx99_tenant" ADD COLUMN "logo_url" VARCHAR(500);
-- 資料起算點（v1.2 §12.3）：起算之前歷史只進查詢、不計入報表
ALTER TABLE "nx99_tenant" ADD COLUMN "data_start_date" DATE;
-- 匯入精靈完成時間（NULL = 未完成、首次登入會跳）
ALTER TABLE "nx99_tenant" ADD COLUMN "import_wizard_completed_at" TIMESTAMP(3);
-- 訂閱方案 LITE / PLUS / PRO
ALTER TABLE "nx99_tenant" ADD COLUMN "plan_code" VARCHAR(10);

-- ─────────────────────────────────────────
-- Nx01User 加首次登入 / 負責人 / 精靈相關欄位
-- ─────────────────────────────────────────
ALTER TABLE "nx01_user" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
-- 是否為租戶負責人（OWNER 角色 + 此 flag = 老闆 / 總經理）
ALTER TABLE "nx01_user" ADD COLUMN "is_tenant_owner" BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────
-- 新建 nx01_user_page_guide：每位員工 × 每頁面的設定精靈記憶
-- v1.2 §3.3 「員工 A 第一次進報價單 → 自動跳精靈 → 看完 → 旗標記住」
-- ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_nx01_user_page_guide_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_user_page_guide_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01UPGD' || LPAD(nextval('seq_nx01_user_page_guide_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE "nx01_user_page_guide" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_user_page_guide_id(),
  "tenant_id" VARCHAR(15) NOT NULL,
  "user_id" VARCHAR(15) NOT NULL,
  "page_key" VARCHAR(100) NOT NULL,
  "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nx01_user_page_guide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx01_user_page_guide_user_page_uq"
  ON "nx01_user_page_guide"("user_id", "page_key");

ALTER TABLE "nx01_user_page_guide"
  ADD CONSTRAINT "fk_nx01_user_page_guide_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id");

ALTER TABLE "nx01_user_page_guide"
  ADD CONSTRAINT "fk_nx01_user_page_guide_user"
  FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id");

-- ─────────────────────────────────────────
-- 新建 nx01_import_batch：匯入精靈每次上傳的批次紀錄
-- 用於：UI 顯示成功 / 失敗筆數、可重看 history
-- ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_nx01_import_batch_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_import_batch_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01IMBA' || LPAD(nextval('seq_nx01_import_batch_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE "nx01_import_batch" (
  "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_import_batch_id(),
  "tenant_id" VARCHAR(15) NOT NULL,
  "uploaded_by" VARCHAR(15) NOT NULL,
  -- 'employee' | 'partner' | 'warehouse' | 'product' | 'purchase-history' | 'sale-history' | 'voucher'
  "import_type" VARCHAR(30) NOT NULL,
  "file_name" VARCHAR(255),
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "success_rows" INTEGER NOT NULL DEFAULT 0,
  "failed_rows" INTEGER NOT NULL DEFAULT 0,
  -- failed rows detail JSON：[{ rowNo: 12, reason: 'Email 格式錯誤' }, ...]
  "failure_detail" JSONB,
  -- 'previewing' | 'imported' | 'cancelled'
  "status" VARCHAR(20) NOT NULL DEFAULT 'previewing',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "imported_at" TIMESTAMP(3),
  CONSTRAINT "nx01_import_batch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nx01_import_batch_tenant_type_idx"
  ON "nx01_import_batch"("tenant_id", "import_type");

ALTER TABLE "nx01_import_batch"
  ADD CONSTRAINT "fk_nx01_import_batch_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id");

ALTER TABLE "nx01_import_batch"
  ADD CONSTRAINT "fk_nx01_import_batch_uploader"
  FOREIGN KEY ("uploaded_by") REFERENCES "nx01_user"("id");
