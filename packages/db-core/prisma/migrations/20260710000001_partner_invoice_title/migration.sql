-- packages/db-core/prisma/migrations/20260710000001_partner_invoice_title/migration.sql
-- 偉盟設計檢視 P1-2（2026-07-10 執行長拍板）：發票抬頭
--   nx01_partner.invoice_title         主檔預設抬頭（可異於客戶名稱；空=用 name）
--   nx01_partner_address.invoice_title BILLING 該筆各自開票抬頭（空=用 partner 主檔）
-- ⚠️ 本機 migration 追蹤表壞 → 以 prisma db execute 手動套用（不走 migrate dev）
ALTER TABLE nx01_partner ADD COLUMN IF NOT EXISTS invoice_title VARCHAR(120);
ALTER TABLE nx01_partner_address ADD COLUMN IF NOT EXISTS invoice_title VARCHAR(120);
