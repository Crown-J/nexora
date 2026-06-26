-- 2026-06-26 Hank：零件主檔重構 Step 2
-- 廠牌料號 sec_code 改必填（NOT NULL）。
-- 執行長拍板：基準料號(code) + 廠牌料號(sec_code) 皆必填。
-- 前置：零件資料已於 Step 2 前清空（重新匯入），故無需 backfill，直接加約束。

ALTER TABLE "nx01_part"
  ALTER COLUMN "sec_code" SET NOT NULL;
