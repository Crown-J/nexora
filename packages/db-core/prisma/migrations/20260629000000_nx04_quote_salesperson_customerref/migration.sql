-- 2026-06-29 Hank：報價單表頭加 業務員 + 參考文號（沿用 SO salesPersonId 範式）
-- nx04_quote 加 sales_person_id（FK nx01_user、ON DELETE SET NULL）+ customer_ref_no
-- 業務語意（執行長拍板）：業務員建單預設帶當前使用者、可改；參考文號＝客戶採購單號等對帳用
-- additive、兩欄皆 nullable、現有資料不需 backfill
-- ⚠️ 本機 migration 追蹤表已壞（dump 還原未帶 _prisma_migrations），本檔以 db execute 手動套用、未走 migrate dev

ALTER TABLE "nx04_quote"
  ADD COLUMN "sales_person_id" VARCHAR(15),
  ADD COLUMN "customer_ref_no" VARCHAR(50);

CREATE INDEX "nx04_quote_sales_person_id_idx" ON "nx04_quote"("sales_person_id");

ALTER TABLE "nx04_quote" ADD CONSTRAINT "nx04_quote_sales_person_id_fkey"
  FOREIGN KEY ("sales_person_id") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
