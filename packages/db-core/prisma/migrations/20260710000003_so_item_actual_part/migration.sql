-- packages/db-core/prisma/migrations/20260710000003_so_item_actual_part/migration.sql
-- 偉盟設計檢視 P1-5（2026-07-10 執行長拍板）：銷貨明細「實際出貨料號」（替代出貨）
--   nx04_so_item.actual_part_id VARCHAR(15) FK nx01_part ON DELETE SET NULL（null=照下單料號出）
--   nx04_so_item.actual_part_no VARCHAR(50) 快照
-- ⚠️ 本機 migration 追蹤表壞 → 以 prisma db execute 手動套用（不走 migrate dev）
ALTER TABLE nx04_so_item ADD COLUMN IF NOT EXISTS actual_part_id VARCHAR(15);
ALTER TABLE nx04_so_item ADD COLUMN IF NOT EXISTS actual_part_no VARCHAR(50);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nx04_so_item_actual_part_id_fkey'
  ) THEN
    ALTER TABLE nx04_so_item
      ADD CONSTRAINT nx04_so_item_actual_part_id_fkey
      FOREIGN KEY (actual_part_id) REFERENCES nx01_part(id) ON DELETE SET NULL;
  END IF;
END $$;
