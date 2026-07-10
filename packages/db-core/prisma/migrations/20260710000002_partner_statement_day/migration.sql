-- packages/db-core/prisma/migrations/20260710000002_partner_statement_day/migration.sql
-- 偉盟設計檢視 P1-4（2026-07-10 執行長拍板）：每月結帳日
--   nx01_partner.statement_day SMALLINT（1~31、31=月底慣例；null=未設定；應用層驗證範圍）
-- ⚠️ 本機 migration 追蹤表壞 → 以 prisma db execute 手動套用（不走 migrate dev）
ALTER TABLE nx01_partner ADD COLUMN IF NOT EXISTS statement_day SMALLINT;
