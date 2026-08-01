-- packages/db-core/prisma/migrations/20260801040000_gl_spine_c_refund_and_opening/migration.sql
-- 總帳脊椎 C 階段：兩個新科目 ＋ 退款/開帳的分錄形狀（2026-08-01 執行長拍板）
--
-- ⭐ 兩格新科目，兩格都是為了「一個數字只講一件事」：
--   · 2142 其他應付款   ＝ 我們欠客戶／往來對象的錢（銷貨退回選退現金）
--     ⛔ 不塞 2141 預收貨款（那是客戶先付的訂金，兩件事）
--     ⛔ 不記成沖減 1111（帳面會顯示兩不相欠，但真實方向相反——退款義務就此消失）
--   · 3103 期初承接權益 ＝ 開帳時把既有資產帶進來的對方科目
--     ⛔ 不塞 3201 累積盈餘（那個數字的意思是「過去營運賺了多少」，塞進去等於讓它說謊）
--
-- ⭐ 兩條規則改成「幾選一」，形狀比照既有的 WCLM 保固索賠（借方三選一）：
--   · PR 進貨退出：借方二選一 —— 沖抵應付(2101) 或 廠商退款(1113)
--     🔴 系統實測走的是後者（PR 過帳建的是應收、不是沖應付），但 1113 要跟客戶的 1111 分開
--   · SR 銷貨退回：貸方二選一 —— 折抵未來貨款(1111) 或 現金退回(2142)
--
-- ⭐ 一個新交易代號 OPEN-BF 期初存貨（承接·來源不明）：
--   原有三個開帳代號都要知道「這批貨當初怎麼來的」（賒欠/現購/實物出資），
--   但從舊系統承接的庫存沒有這個資訊——恆迎 2.32 億就是這種。
--   硬選一個等於憑空生出一筆負債或現金流出。

-- ── 1) 兩個新科目 ──────────────────────────────────────────────
INSERT INTO "nx05_account_code"
  (tenant_id, code, name, category, account_class_id, cash_flow_type, is_postable, is_active,
   "level", parent_id, partner_scope, require_dept, require_partner, sort_no, is_system,
   remark, created_by, updated_at, updated_by)
SELECT p.tenant_id, v.code, v.name, p.category, p.account_class_id, v.cf, true, true,
       3, p.id, 'PARTNER', false, v.req_partner, 0, true,
       v.remark, p.created_by, NOW(), p.updated_by
FROM (VALUES
  ('2142', '其他應付款',   '21', 'O', true,
   '我們欠客戶／往來對象的錢，主要來源是銷貨退回選「退現金」。⛔ 不塞 2141 預收貨款（那是客戶先付的訂金）；⛔ 不記成沖減 1111 應收帳款（帳面會顯示兩不相欠，但真實方向相反）。'),
  ('3103', '期初承接權益', '31', 'N', false,
   '開帳時把既有資產帶進來的對方科目。⛔ 不塞 3201 累積盈餘——那個數字的意思是「過去營運賺了多少」。⭐ 獨立一格，任何人打開資產負債表都分得出「哪些是開帳帶進來的、哪些是自己賺的」。⚠ 一次性，開帳後不應再有新增。')
) AS v(code, name, parent_code, cf, req_partner, remark)
JOIN "nx05_account_code" p
  ON p.code = v.parent_code
WHERE NOT EXISTS (
  SELECT 1 FROM "nx05_account_code" x
  WHERE x.tenant_id = p.tenant_id AND x.code = v.code
);

-- ── 2) PR 進貨退出：借方二選一 ────────────────────────────────
UPDATE "nx05_posting_rule_line" l
SET    is_optional = true,
       "condition" = '條件性出現：沖抵應付（貨款還沒付）。借方二選一、比照 WCLM 的三選一形狀。',
       remark      = '沖抵應付（貨款還沒付）',
       updated_at  = NOW()
FROM   "nx05_posting_rule" r
WHERE  r.id = l.rule_id AND r.code = 'PR' AND l.line_no = 1;

INSERT INTO "nx05_posting_rule_line"
  (rule_id, line_no, dr_cr, account_code_id, amount_basis,
   require_dept, require_partner, partner_scope, require_bank_account, is_optional,
   "condition", remark, created_by, updated_at, updated_by)
SELECT r.id, 4, 'D', a.id, 'GROSS',
       false, true, 'PARTNER', false, true,
       '條件性出現：廠商退款（貨款已付、廠商欠我方退款）。🔴 這筆應收要跟客戶的 1111 應收帳款分開——同一個數字不能同時代表「客戶欠我們貨款」跟「廠商該退我們錢」。',
       '廠商退款（貨款已付）', r.created_by, NOW(), r.updated_by
FROM   "nx05_posting_rule" r
JOIN   "nx05_account_code" a ON a.tenant_id = r.tenant_id AND a.code = '1113'
WHERE  r.code = 'PR'
  AND NOT EXISTS (
    SELECT 1 FROM "nx05_posting_rule_line" x WHERE x.rule_id = r.id AND x.line_no = 4
  );

-- ── 3) SR 銷貨退回：貸方二選一 ────────────────────────────────
UPDATE "nx05_posting_rule_line" l
SET    is_optional = true,
       "condition" = '條件性出現：折抵未來貨款（客戶下次採購扣掉）。貸方二選一。',
       remark      = '折抵未來貨款',
       updated_at  = NOW()
FROM   "nx05_posting_rule" r
WHERE  r.id = l.rule_id AND r.code = 'SR' AND l.line_no = 3;

INSERT INTO "nx05_posting_rule_line"
  (rule_id, line_no, dr_cr, account_code_id, amount_basis,
   require_dept, require_partner, partner_scope, require_bank_account, is_optional,
   "condition", remark, created_by, updated_at, updated_by)
SELECT r.id, 6, 'C', a.id, 'GROSS',
       false, true, 'PARTNER', false, true,
       '條件性出現：現金退回（我們要把錢還給客戶）。🔴 退現金是負債、不是應收的減少。',
       '現金退回（欠客戶的錢）', r.created_by, NOW(), r.updated_by
FROM   "nx05_posting_rule" r
JOIN   "nx05_account_code" a ON a.tenant_id = r.tenant_id AND a.code = '2142'
WHERE  r.code = 'SR'
  AND NOT EXISTS (
    SELECT 1 FROM "nx05_posting_rule_line" x WHERE x.rule_id = r.id AND x.line_no = 6
  );

-- ── 4) 新交易代號 OPEN-BF 期初存貨（承接·來源不明）────────────
INSERT INTO "nx05_posting_rule"
  (tenant_id, code, name, cycle_code, legal_cycle_code, status, is_active,
   remark, created_by, updated_at, updated_by)
SELECT r.tenant_id, 'OPEN-BF', '期初存貨（承接·來源不明）', 'INVENTORY', 'INVENTORY', 'ACTIVE', true,
       '⭐ 原有三個開帳代號都要知道「這批貨當初怎麼來的」（賒欠／現購／實物出資），但從舊系統承接的庫存沒有這個資訊。硬選一個等於憑空生出一筆負債或現金流出。對方科目走 3103 期初承接權益。⚠ 一次性，開帳後不應再用。',
       r.created_by, NOW(), r.updated_by
FROM   "nx05_posting_rule" r
WHERE  r.code = 'OPEN-EQ'
  AND NOT EXISTS (
    SELECT 1 FROM "nx05_posting_rule" x WHERE x.tenant_id = r.tenant_id AND x.code = 'OPEN-BF'
  );

INSERT INTO "nx05_posting_rule_line"
  (rule_id, line_no, dr_cr, account_code_id, amount_basis,
   require_dept, require_partner, partner_scope, require_bank_account, is_optional,
   "condition", remark, created_by, updated_at, updated_by)
SELECT r.id, v.line_no, v.dr_cr, a.id, 'AMOUNT',
       v.req_dept, false, 'PARTNER', false, false,
       NULL, v.remark, r.created_by, NOW(), r.updated_by
FROM   "nx05_posting_rule" r
JOIN  (VALUES
        (1, 'D', '1121', true,  '承接進來的庫存價值'),
        (2, 'C', '3103', false, '⛔ 不是 3201 累積盈餘——那個數字的意思是「過去營運賺了多少」。')
      ) AS v(line_no, dr_cr, acc_code, req_dept, remark) ON TRUE
JOIN   "nx05_account_code" a ON a.tenant_id = r.tenant_id AND a.code = v.acc_code
WHERE  r.code = 'OPEN-BF'
  AND NOT EXISTS (
    SELECT 1 FROM "nx05_posting_rule_line" x WHERE x.rule_id = r.id AND x.line_no = v.line_no
  );
