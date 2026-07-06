-- NX04 紀錄表 B3（2026-07-06）：同行調貨單明細加「來源詢價紀錄」欄。
--   建 TI 時從詢價紀錄帶同行報價填 unit_cost，並回指來源詢價紀錄（可追溯這個成本哪來的）。
-- ⚠️ 本機 migrate dev 壞（見 feedback_prisma7_quirks），此檔為紀錄；實際以 prisma db execute 套用。
-- 純加法（nullable 欄）、不設 FK（id 快照、同 rfqItemId 為輕指標）。
ALTER TABLE "nx02_ti_item" ADD COLUMN "source_inquiry_record_id" VARCHAR(15);
