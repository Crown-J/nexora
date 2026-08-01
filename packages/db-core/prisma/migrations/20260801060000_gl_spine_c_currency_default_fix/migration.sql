-- packages/db-core/prisma/migrations/20260801060000_gl_spine_c_currency_default_fix/migration.sql
-- 總帳脊椎 C9：收掉 12 個壞掉的幣別預設值（2026-08-01）
--
-- 🔴 壞在哪：這 12 張表的 currency_id 是外鍵，指向 nx01_currency 的主鍵（NX01CURR0000001 這種內碼），
--    但預設值卻寫成 'TWD' 這個字面值——那不是任何一列的主鍵。
--    ⚠ 所以「不傳幣別就用預設」這件事**從來沒有成功過**，一律是外鍵違反、整筆寫入失敗。
--    ⭐ 本軌 B6 與 C2 都實際踩到（建測試銷貨單／進貨單時炸掉），不是理論風險。
--
-- 解法：拿掉預設值，讓幣別變成必填。
--    ⭐ 為什麼這樣做是安全的：預設值本來就沒有一次生效過，
--       所以「拿掉它」不會改變任何一條成功路徑的行為——只會把原本會在執行期炸掉的地方
--       提前到編譯期擋下來。實測全庫只有 1 處呼叫端沒傳幣別（同行調貨詢價的明細），已一併補上。
--
-- ⛔ 刻意不動 nx02_rfq.currency：那一欄存的是幣別代碼「文字」、不是外鍵，
--    'TWD' 放在那裡是正確的預設值。同名不同事，不要一起改。

ALTER TABLE "nx02_po"              ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx02_pr"              ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx02_rfq_item"        ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx02_rr"              ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx04_inquiry_record"  ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx04_quote"           ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx04_quote_record"    ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx04_so"              ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx05_ap_ledger"       ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx05_ar_ledger"       ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx05_note"            ALTER COLUMN "currency_id" DROP DEFAULT;
ALTER TABLE "nx05_paylog"          ALTER COLUMN "currency_id" DROP DEFAULT;
