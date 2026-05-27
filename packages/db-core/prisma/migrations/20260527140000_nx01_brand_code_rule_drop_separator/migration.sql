-- 收尾軌：移除廠牌料號規則的分隔符欄位（全 NEXORA 料號 SEG 一律單個空格）。
ALTER TABLE "nx01_brand_code_rule" DROP COLUMN IF EXISTS "separator";
