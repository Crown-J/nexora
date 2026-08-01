-- packages/db-core/prisma/migrations/20260801050000_gl_spine_c_opening_ar_ap/migration.sql
-- 總帳脊椎 C7：期初應收／期初應付兩個交易代號（2026-08-01）
--
-- ⭐ 為什麼要新代號，不能沿用既有的 OPEN-*：
--   OPEN-AP／OPEN-CA／OPEN-EQ／OPEN-BF 講的全是**期初存貨**（差別只在當初怎麼取得的）。
--   ⛔ 特別注意 OPEN-AP 這個代號叫「期初存貨（承接·賒欠）」，**不是期初應付**——
--      名字很像、意思完全不同，所以期初應付只能另取代號 OPEN-PAY。
--
-- ⭐ 應收借方拆兩格（沿用 C4 的判斷）：
--   客戶欠我們貨款 → 1111 應收帳款；廠商該退我們錢（進貨退出）→ 1113 其他應收款。
--   同一個數字不能同時代表兩件事，對帳表也是分兩項在比。
--
-- 對方科目一律 3103 期初承接權益，與期初存貨一致
-- ——⛔ 不是 3201 累積盈餘（那個數字的意思是「過去營運賺了多少」）。

INSERT INTO "nx05_posting_rule"
  (tenant_id, code, name, cycle_code, legal_cycle_code, status, is_active,
   remark, created_by, updated_at, updated_by)
SELECT r.tenant_id, v.code, v.name, v.cycle, v.legal, 'ACTIVE', true,
       v.remark, r.created_by, NOW(), r.updated_by
FROM   "nx05_posting_rule" r
JOIN  (VALUES
  ('OPEN-RCV', '期初應收（承接）', 'SALES',    'SALES_RECEIPT',
   '開帳日當天客戶還欠的錢。⭐ 借方兩格分開——客戶欠的貨款走 1111，廠商該退我方的錢走 1113。對方科目 3103 期初承接權益。⚠ 一次性、每個往來對象一張傳票。'),
  ('OPEN-PAY', '期初應付（承接）', 'PURCHASE', 'PURCHASE_PAYMENT',
   '開帳日當天我方還欠廠商的錢。⚠ 一次性、每個往來對象一張傳票。⛔ 代號不能叫 OPEN-AP——那個已經被「期初存貨（承接·賒欠）」用掉了。')
) AS v(code, name, cycle, legal, remark) ON TRUE
WHERE  r.code = 'OPEN-BF'
  AND NOT EXISTS (
    SELECT 1 FROM "nx05_posting_rule" x WHERE x.tenant_id = r.tenant_id AND x.code = v.code
  );

INSERT INTO "nx05_posting_rule_line"
  (rule_id, line_no, dr_cr, account_code_id, amount_basis,
   require_dept, require_partner, partner_scope, require_bank_account, is_optional,
   "condition", remark, created_by, updated_at, updated_by)
SELECT r.id, v.line_no, v.dr_cr, a.id, v.basis,
       false, v.req_partner, 'PARTNER', false, v.optional,
       v.cond, v.remark, r.created_by, NOW(), r.updated_by
FROM   "nx05_posting_rule" r
JOIN  (VALUES
  ('OPEN-RCV', 1, 'D', '1111', 'AR_TRADE', true,  true,
   '條件性出現：該對象有客戶應收（欠我們貨款）', '客戶欠的貨款'),
  ('OPEN-RCV', 2, 'D', '1113', 'AR_OTHER', true,  true,
   '條件性出現：該對象有廠商退款應收（進貨退出）', '廠商該退我方的錢'),
  ('OPEN-RCV', 3, 'C', '3103', 'AMOUNT',   false, false,
   NULL, '兩種應收的合計。⛔ 不是 3201 累積盈餘。'),
  ('OPEN-PAY', 1, 'D', '3103', 'AMOUNT',   false, false,
   NULL, '⛔ 不是 3201 累積盈餘。承接進來的負債同樣掛在期初承接權益。'),
  ('OPEN-PAY', 2, 'C', '2101', 'AMOUNT',   true,  false,
   NULL, '我方還欠廠商的貨款')
) AS v(rule_code, line_no, dr_cr, acc_code, basis, req_partner, optional, cond, remark)
  ON v.rule_code = r.code
JOIN   "nx05_account_code" a ON a.tenant_id = r.tenant_id AND a.code = v.acc_code
WHERE  r.code IN ('OPEN-RCV', 'OPEN-PAY')
  AND NOT EXISTS (
    SELECT 1 FROM "nx05_posting_rule_line" x WHERE x.rule_id = r.id AND x.line_no = v.line_no
  );
