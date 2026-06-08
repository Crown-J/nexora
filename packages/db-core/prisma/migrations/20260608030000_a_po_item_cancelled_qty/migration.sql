-- packages/db-core/prisma/migrations/20260608030000_a_po_item_cancelled_qty/migration.sql
-- 03 收尾 A 2026-06-08：採購單明細加「取消量」、部分進貨後可取消剩餘把單收掉。
--
-- 業務語意（總經理拍板補做）：
--   - 採購單 line：qty=採購數量、receivedQty=已進量、cancelledQty=取消量（缺貨剩餘可取消）
--   - 剩餘可收 = qty - receivedQty - cancelledQty
--   - 當所有 line 都「剩餘=0」、採購單可以結案
--
-- 全 additive、default 0、既有資料 backfill = 0（語意：歷史單沒取消）。
-- 備份：dev-backups/pre-t8a-cancelled-qty_20260608_020000.sql (1.2MB)

ALTER TABLE "nx02_po_item"
  ADD COLUMN "cancelled_qty" DECIMAL(14, 4) DEFAULT 0 NOT NULL;
