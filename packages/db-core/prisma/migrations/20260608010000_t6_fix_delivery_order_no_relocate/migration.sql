-- packages/db-core/prisma/migrations/20260608010000_t6_fix_delivery_order_no_relocate/migration.sql
-- T6 進貨對齊批次 2026-06-08 修正：把 deliveryOrderNo 從 Nx02RrImport 移到 Nx02Rr header
--
-- 為何修正：Nx02RrImport 沒有 CRUD controller / dto（只在 RR 過帳時被讀取做費用攤分），
--   把 deliveryOrderNo 放在那邊會無從寫入。改放 Nx02Rr header 後、UI 可直接走 RR.update 寫入、
--   保留「import RR 才有意義」的業務語意（國內 RR 留 null 即可）。
--
-- 既有 dev DB：nx02_rr_import.delivery_order_no 從未被任何 service 寫入過、drop 安全。
-- 全 additive + 無資料遷移（既存 RrImport.delivery_order_no 一定是 NULL）。

ALTER TABLE "nx02_rr_import" DROP COLUMN "delivery_order_no";

ALTER TABLE "nx02_rr"
  ADD COLUMN "delivery_order_no" VARCHAR(50);
