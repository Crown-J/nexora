-- packages/db-core/prisma/migrations/20260801030000_gl_spine_c_tax_line_optional/migration.sql
-- 總帳脊椎 C 階段：把 16 條「稅額」分錄行改成條件性（2026-08-01）
--
-- 🔴 這是修一個會炸的東西，不是調整偏好：
--    postByRule 的守門規則是「非條件性分錄行金額為 0 就報錯」。
--    但稅額為 0 在本系統是**合法狀態**——免稅商品、零稅率、免用統一發票的小規模對象。
--    這 16 條稅額行原本都標成非條件性，所以只要過一張免稅的進貨單或銷貨單，
--    過帳就會丟例外，而過帳是在營運交易裡面呼叫的 → **整張單會被一起 rollback**。
--    ⚠ 目前還沒有租戶設會計期間，所以還沒引爆；等總帳一啟用，第一張免稅單就會踩到。
--
-- ⭐ 為什麼標成條件性不會掩蓋「呼叫端忘了傳稅額」的 bug：
--    借貸平衡檢查還在——未稅＋稅額必須等於含稅。真的忘了傳，傳票會因為不平被擋下來。
--
-- 判準與 B 階段那 15 條結轉成本行相同：本質上條件性、卻沒標。

UPDATE "nx05_posting_rule_line" l
SET    "is_optional" = true,
       "condition"   = '條件性出現：稅額為 0 時不產生本行（免稅／零稅率／免用統一發票的小規模對象）',
       "updated_at"  = NOW()
FROM   "nx05_posting_rule" r
WHERE  r."id" = l."rule_id"
  AND  l."amount_basis" = 'TAX'
  AND  l."is_optional" = false;
