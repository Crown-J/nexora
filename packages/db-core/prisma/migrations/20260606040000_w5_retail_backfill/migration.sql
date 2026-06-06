-- packages/db-core/prisma/migrations/20260606040000_w5_retail_backfill/migration.sql
-- W5 step1 風險① 補：替既有 active 租戶補建散客 L0001（NX-MANUAL-02 v2.0 §3.5）
--
-- 為什麼：W4 onboarding.service 已自動建散客、但既有測試租戶（TEST-LITE/PLUS/PRO）
--   及伊諾瓦既有 demo 租戶在 W4 前已開戶、未經過 onboarding 路徑、所以缺散客 L0001。
--   缺散客會導致客戶銷貨時選不到「散客」、無統編 B2C 交易無歸屬。
--
-- 邏輯：
--   對所有 isActive=true 的 tenant、若沒有 partnerType='L' 的 partner、就建一筆 L0001
--   + 對應 nx01_seq_counter row (PARTNER_L、nextNo=2)
--
-- 全程冪等（NOT EXISTS 守住）、可安全重跑。
-- createdBy / updatedBy 用 SYSADMIN（系統建立、跟 INNOVA seed 範式一致）

-- ============================================================
-- 1. 對缺散客 partner 的 active 租戶補建 L0001
--    （updated_at 無 DB default、需顯式給；prisma @updatedAt 只在 prisma client 層作用）
-- ============================================================
INSERT INTO "nx01_partner" (
  id, tenant_id, code, name, partner_type, can_transfer_stock,
  payment_term_domestic, credit_status, credit_limit, default_invoice_copies,
  is_active, created_by, updated_by, updated_at
)
SELECT
  gen_nx01_partner_id(),
  t.id,
  'L0001',
  '散客',
  'L',
  false,
  'PREPAY',
  'N',
  0,
  2,
  true,
  'NX01USER0000001',
  'NX01USER0000001',
  CURRENT_TIMESTAMP
FROM "nx99_tenant" t
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM "nx01_partner" p
    WHERE p.tenant_id = t.id
      AND p.partner_type = 'L'
  );

-- ============================================================
-- 2. 對沒有 PARTNER_L seq_counter 的 active 租戶補建（nextNo=2、L0001 已用）
-- ============================================================
INSERT INTO "nx01_seq_counter" (
  id, tenant_id, scope, next_no, updated_at
)
SELECT
  gen_nx01_seq_counter_id(),
  t.id,
  'PARTNER_L',
  2,
  CURRENT_TIMESTAMP
FROM "nx99_tenant" t
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM "nx01_seq_counter" c
    WHERE c.tenant_id = t.id
      AND c.scope = 'PARTNER_L'
  );
