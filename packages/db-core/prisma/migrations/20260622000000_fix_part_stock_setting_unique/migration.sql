-- packages/db-core/prisma/migrations/20260622000000_fix_part_stock_setting_unique/migration.sql
-- 補 schema drift：nx03_part_stock_setting 的 @@unique([tenantId, partId, warehouseId])
-- schema 早有寫但歷史 migration 漏建索引、ON CONFLICT 子句因此失敗。
-- CYTIC 庫存匯入時發現（2026-06-22 Hank）

CREATE UNIQUE INDEX IF NOT EXISTS nx03_part_stock_setting_tenant_id_part_id_warehouse_id_key
  ON nx03_part_stock_setting (tenant_id, part_id, warehouse_id);
