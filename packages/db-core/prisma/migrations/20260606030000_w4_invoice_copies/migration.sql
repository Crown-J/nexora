-- packages/db-core/prisma/migrations/20260606030000_w4_invoice_copies/migration.sql
-- W4 [3-6] 2026-06-06 發票聯式（NX-MANUAL-02 v2.0 §3.6）
--   - Nx01Partner.default_invoice_copies SMALLINT NOT NULL DEFAULT 3
--   - Nx04So.invoice_copies SMALLINT NOT NULL DEFAULT 3
--   - 設計：建單時 service 從 partner.default 帶入、user 可逐筆改；散客 L application 層強制 2
--   - 既有 row：DEFAULT 3 自動 backfill（業界 muscle memory：有統編企業多 3 聯為主）
-- 全程冪等（IF NOT EXISTS）可安全重跑。
-- Alex 拍板選項 C 純精簡：本 migration 不混 W3.5 schema drift cleanup。

ALTER TABLE "nx01_partner"
  ADD COLUMN IF NOT EXISTS "default_invoice_copies" SMALLINT NOT NULL DEFAULT 3;

ALTER TABLE "nx04_so"
  ADD COLUMN IF NOT EXISTS "invoice_copies" SMALLINT NOT NULL DEFAULT 3;
