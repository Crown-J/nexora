-- packages/db-core/scripts/cleanup-20260602-hengying-add-subscription.sql
-- 恆迎 TW-100001 補建訂閱（onboarding 漏建的修復、配套 commit）
--
-- 執行環境：localhost（PostgreSQL nexora_core）
-- 執行時間：2026-06-02
-- 執行者：Hank（總經理拍板 A：純 INSERT 補資料、保留恆迎不重開）
--
-- 背景：
-- - onboarding.service.ts 之前漏建 nx99_subscription、僅建 nx99_tenant 帶 plan_code 欄
-- - 導致 me API plan_code=null（從 nx99_subscription 查）、客戶端 21 卡載入失敗
-- - 對應修法 1（onboarding 加建訂閱）同 commit
-- - 對應修法 2（HomeDashboardBody mustChange guard）同 commit
-- - 本 script 補既有恆迎這一筆、之後新開戶不需要
--
-- 影響面：1 row INSERT、不動既有資料、不動 schema、Railway 完全不碰

INSERT INTO nx99_subscription (
  id, tenant_id, plan_id, status, billing_cycle, seats,
  start_at, end_at, auto_renew,
  base_fee_snapshot, seat_fee_snapshot,
  discount_type_snapshot, discount_value_snapshot,
  subtotal_snapshot, discount_amount_snapshot, total_snapshot,
  currency_id,
  created_at, created_by, updated_at, updated_by
)
SELECT
  gen_nx99_subscription_id(),
  t.id,
  p.id,
  'A',
  'M',
  10,
  CURRENT_DATE,
  '2099-12-31',
  TRUE,
  p.base_fee_month,
  p.seat_fee_month,
  'N', 0,
  p.base_fee_month, 0, p.base_fee_month,
  c.id,
  CURRENT_TIMESTAMP, 'NX01USER0000001',
  CURRENT_TIMESTAMP, 'NX01USER0000001'
FROM nx99_tenant t, nx99_plan p, nx01_currency c
WHERE t.code = 'TW-100001'
  AND p.code = 'NEXORA-LITE-M'
  AND c.code = 'TWD';
