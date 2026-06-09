-- packages/db-core/prisma/migrations/20260609020000_05_fillgap/migration.sql
-- 05 銷貨手冊補做 2026-06-09（Alex 拍板：總經理全補 C1~C6 + B5）
--
-- 業務語意：
--   C1 銷貨退回加「退回方式」：A=業務發起 / B=送貨員當場帶回
--   C2 銷貨單加「業務員」：salesPersonId（FK Nx01User、跟 createdBy 分開）
--   C3 銷貨單加「銷貨方式」：salesMethod 字串（自叫／網路單／櫃台…、UI 端 datalist）
--   C4 銷貨單加「帳款年月」：accountPeriod DATE（存月份第一天、供應收歸帳查詢用）
--   B5 銷貨明細加「廠牌 snapshot」：建單時 snapshot 料件廠牌（避免主檔變動影響歷史）
--   C6 SoStatus 加 'COMPLETED'（state 是 VARCHAR(30)、無 enum 限制；state machine code 端加 edge）
--
-- 備份：dev-backups/pre-05-fillgap_20260609_010000.sql（1.26MB）
-- 全 additive、6 個 ADD COLUMN、零 schema 刪改；三版本一致（LITE-CORE）。

-- ① Nx04Sr 加退回方式
ALTER TABLE "nx04_sr"
  ADD COLUMN "initiation_type" VARCHAR(1);
-- A=業務發起（計畫性、業務接到客戶要退就建單）
-- B=送貨員當場帶回（臨時、配送時被告知）

CREATE INDEX "nx04_sr_initiation_type_idx" ON "nx04_sr" ("tenant_id", "initiation_type");

-- ② Nx04So 加業務員 / 銷貨方式 / 帳款年月
ALTER TABLE "nx04_so"
  ADD COLUMN "sales_person_id" VARCHAR(15);
ALTER TABLE "nx04_so"
  ADD CONSTRAINT "nx04_so_sales_person_id_fkey"
  FOREIGN KEY ("sales_person_id") REFERENCES "nx01_user"("id") ON UPDATE CASCADE;
CREATE INDEX "nx04_so_sales_person_id_idx" ON "nx04_so" ("sales_person_id");

ALTER TABLE "nx04_so"
  ADD COLUMN "sales_method" VARCHAR(20);
-- 業界口語：自叫 / 網路單 / 櫃台 / 業務上門 / ...（UI 端 datalist 常用值、可手填）

ALTER TABLE "nx04_so"
  ADD COLUMN "account_period" DATE;
-- 帳款歸到哪個月（存月份第一天、例 2026-06-01 表「2026 年 6 月」）

CREATE INDEX "nx04_so_account_period_idx" ON "nx04_so" ("tenant_id", "account_period");

-- ③ Nx04SoItem 加廠牌 snapshot（B5）
ALTER TABLE "nx04_so_item"
  ADD COLUMN "brand_id" VARCHAR(15);
ALTER TABLE "nx04_so_item"
  ADD COLUMN "brand_name" VARCHAR(100);
-- 建單時 snapshot 料件廠牌；避免主檔 brand 更名後影響歷史 SO 顯示
