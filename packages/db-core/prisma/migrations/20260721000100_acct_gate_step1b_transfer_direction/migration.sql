-- packages/db-core/prisma/migrations/20260721000100_acct_gate_step1b_transfer_direction/migration.sql
-- 往來帳戶閘門 Step 1b（規格 v1.3、2026-07-21 執行長指出貨源隔離問題）：
--   付款帳戶拆兩種：P=進貨付款（採購域、綁採購權限、銀行資訊）/ T=調貨付款（業務域、輕量免銀行）。
--   資料修正：Step 1 自動開戶時同行 O 開的 P 戶 → 全數轉 T 調貨戶（銀行資訊本來就空、needs_backfill 對 T 戶無意義一併歸零）。
--   同行若同時是正規進貨來源、之後由採購另開 P 戶。
-- ⚠️ 本機 migration 追蹤表壞 → prisma db execute 手動套用（沿用 0720 範式）

UPDATE nx01_partner_account a
SET direction = 'T', needs_backfill = false, updated_by = 'NX01USER0000001'
FROM nx01_partner p
WHERE p.id = a.partner_id
  AND a.direction = 'P'
  AND p.partner_type = 'O';
