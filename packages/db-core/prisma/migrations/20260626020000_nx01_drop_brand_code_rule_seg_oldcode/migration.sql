-- 2026-06-26 Hank：零件主檔重構 Step 3
-- 移除分段編碼規則（brand_code_rule + codeRuleId + seg1~5）與舊料號（oldCode）。
-- 執行長拍板：基準料號純手動輸入、不再分段編碼；舊料號與基準料號重複、無意義故移除。
-- 前置：零件資料已清空，無資料遺失風險。

-- 1. nx01_part 移除 code_rule_id FK + seg1~5 + old_code
ALTER TABLE "nx01_part" DROP CONSTRAINT IF EXISTS "nx01_part_code_rule_id_fkey";
ALTER TABLE "nx01_part"
  DROP COLUMN IF EXISTS "code_rule_id",
  DROP COLUMN IF EXISTS "seg1",
  DROP COLUMN IF EXISTS "seg2",
  DROP COLUMN IF EXISTS "seg3",
  DROP COLUMN IF EXISTS "seg4",
  DROP COLUMN IF EXISTS "seg5",
  DROP COLUMN IF EXISTS "old_code";

-- 2. DROP 編碼規則表 + 其 ID generator / sequence
DROP TABLE IF EXISTS "nx01_brand_code_rule";
DROP FUNCTION IF EXISTS gen_nx01_brand_code_rule_id();
DROP SEQUENCE IF EXISTS "seq_nx01_brand_code_rule_id";
